(function () {
    // TODO: fix checkInput()

    // Tried using a "Controller as" approach
    // https://toddmotto.com/digging-into-angulars-controller-as-syntax/
    var app = angular.module("sentenceBuilder", [])
        .controller("sentenceBuilderController", ["$http", "$interval", function ($http, $interval) {
            // Some variables
            var $ctrl = this;
            var answer;
            var originalSentences = [];
            var sentences = [];
            var timer = null;
            var time = 30000;

            // Helper functions to add and remove classes from DOM-elements
            var addToElementClassList = function (elementId, className) {
                var element = document.getElementById(elementId);
                for (var i = 0, j = className.length; i < className.length; i++) {
                    if (!element.classList.contains(className[i])) {
                        element.classList.add(className[i]);
                    }
                };
            };
            var removeFromElementClassList = function (elementId, className) {
                var element = document.getElementById(elementId);
                for (var i = 0, j = className.length; i < j; i++) {
                    if (element.classList.contains(className[i])) {
                        element.classList.remove(className[i]);
                    }
                };
            };

            // Gets a new random question
            var getRandomQuestion = function () {
                //checks if we have any questions left, otherwise we simply make new ones
                if (sentences.length <= 0) {
                    sentences = shuffleArray(angular.copy(originalSentences));
                }

                answer = sentences.pop();
                $ctrl.shuffledWords = shuffleArray(answer.split(" "));
            };

            // Shuffles an array (duh)
            var shuffleArray = function (arr) {
                var index = arr.length, tmp, rng;
                while (index != 0) {
                    rng = Math.floor(Math.random() * index);
                    index--;
                    tmp = arr[index];
                    arr[index] = arr[rng];
                    arr[rng] = tmp;
                };
                return arr;
            };

            // Checks if a word is unique in the sentence
            var isUnique = function (word) {
                var correctWords = answer.split(" ");
                var words = $ctrl.answer.replace("&nbsp;", " ").split(" ");
                var num = 0;
                for (var i = 0, j = correctWords.length; i < j; i++) {
                    if (correctWords[i] == word) {
                        num++;
                    }
                    if (i < words.length && words[i] == word) {
                        num--;
                    }
                };
                return num == 0;
            };
            // Checks if a word is in the right place
            var inRightPlace = function (word) {
                var index = $ctrl.answer.replace("&nbsp;", " ").split(" ").lastIndexOf(word);
                var words = answer.split(" ");

                return words[index] == word;
            };
            // Checks if the answer contains the current word
            var answerContains = function (word) {
                if ($ctrl.answer && $ctrl.answer.length) {
                    var words = $ctrl.answer.replace("&nbsp;", " ").split(" ");
                    return words.lastIndexOf(word) > -1;
                }
                return false;
            };

            // will be called 1 second after $ctrl.checkAnswer()
            var getNewRandomQuestion = function () {
                // Fix things
                $interval.cancel(timer);
                removeFromElementClassList("correctAnswerLabel", ["label-success", "label-warning", "label-danger"])
                $ctrl.correctAnswer = null;
                $ctrl.invalidWords = null;
                $ctrl.answer = null;
                answer = null;
                $ctrl.shuffledWords = [];

                // Moved this down here, and changed it a little so there wouldn't be an extra 1 second until redirecting
                // return
                if ($ctrl.count < $ctrl.maxCount-1) {
                    // re-enable all the buttons
                    var btns = document.getElementsByClassName("btn");
                    for (var i = 0, j = btns.length; i < j; i++) {
                        if (btns[i].getAttribute("id") == null) {
                            btns[i].setAttribute("id", "tmpBtnId" + i);
                        }
                        removeFromElementClassList(btns[i].getAttribute("id"), ["disabled"]);
                    };
                    // Re-enable the contenteditable span
                    var inputSpan = document.getElementById("inputSpan");
                    inputSpan.innerHTML = "";
                    inputSpan.setAttribute("contenteditable", "true");

                    // new question
                    getRandomQuestion();

                    // new timer
                    timer = $interval($ctrl.checkAnswer, time);
                    $ctrl.count++;
                }
                else {
                    addToElementClassList("quizDiv", ["hidden"]);
                    removeFromElementClassList("resultDiv", ["hidden"]);
                    removeFromElementClassList("restartBtn", ["disabled"]);
                }
            };
            // Gets the sentences from the database
            var getData = function () {
                $http.get("/api/sentences/get")
                    .then(function (response) {
                        originalSentences = response.data;
                        sentences = shuffleArray(angular.copy(originalSentences));

                        if (sessionStorage.loopList != null) {
                            $ctrl.score = parseInt(sessionStorage.highScore);
                            $ctrl.maxCount = parseInt(sessionStorage.answeredQuestions);
                            $ctrl.count = parseInt(sessionStorage.answeredQuestions);
                            removeFromElementClassList("quizDiv", ["hidden"]);
                            addToElementClassList("startBtn", ["hidden"]);
                            getRandomQuestion();
                        }
                        else {
                            if (sessionStorage.sentenceVar != null) {
                                $ctrl.maxCount = (parseInt(sessionStorage.sentenceVar) - 1);
                            }
                            removeFromElementClassList("startBtn", ["disabled"]);
                        }
                    });
            };

            //############ Accessible from the markup ############//

            // Some more variables
            $ctrl.shuffledWords = [];
            $ctrl.correctAnswer;
            $ctrl.pageTitle = "Build Sentences!";
            $ctrl.pageDesc = [
                "Use the words listed to build sentences, you have 30 seconds to answer.",
                "You can use both the word buttons and the textbox directly to build the sentences.",
                "You get 1 point for every correct sentence, but beware; you lose one point if you use any invalid words!"
            ];

            // functions to set the colour of the buttons
            $ctrl.isGreen = function (word) {
                return answerContains(word) && inRightPlace(word) && isUnique(word);
                };
            $ctrl.isBlue = function (word) {
                return answerContains(word) && inRightPlace(word) && !isUnique(word);
                };
            $ctrl.isOrange = function (word) {
                return answerContains(word) && !inRightPlace(word);
            };
            $ctrl.isWhite = function (word) {
                return !answerContains(word);
            };

            // TODO: fix
            // Update the answer when clicking the word buttons
            $ctrl.updateAnswer = function (word) {
                if (!$ctrl.answer) {
                    $ctrl.answer = "";
                }
                word = word.trim();
                var words = $ctrl.answer.replace("&nbsp;", " ").split(" ");
                var index = words.lastIndexOf(word);

                if (index >= 0 && $ctrl.isOrange(word)) {
                    words.splice(index, 1)
                }
                else if(!$ctrl.isGreen(word)) {
                    words.push(word);
                }

                $ctrl.answer = words.join(" ").trim();
                if ($ctrl.answer == answer) {
                    $ctrl.checkAnswer();
                }
                else {
                $ctrl.checkInput();
                }
            };

            // TODO: fix 
            // Checks input to see if the user has inputed any invalid words.
            $ctrl.checkInput = function () {
                if ($ctrl.answer) {
                    var words = $ctrl.answer.replace("&nbsp;", " ").split(" ");
                    $ctrl.invalidWords = [];
                    for (var i = 0, j = words.length; i < j; i++) {
                        // 
                        var index = answer.indexOf(words[i]);
                        if (words[i].length <= 1 && index != 0) {
                            words[i] += " ";
                        }
                        if (index < 0) {
                            $ctrl.invalidWords.push(words[i]);
                        }
                    };
                    // Shows or hides the div with the invalid words
                    if ($ctrl.invalidWords.length) {
                        removeFromElementClassList("invalidWordsDiv", ["hidden"]);
                    }
                    else {
                        addToElementClassList("invalidWordsDiv", ["hidden"]);
                    }
                }
                else {
                    $ctrl.invalidWords = [];
                    addToElementClassList("invalidWordsDiv", ["hidden"]);
                }
            };

            // Check the answer
            $ctrl.checkAnswer = function () {
                // cancel the timer
                $interval.cancel(timer);

                // disable all the buttons
                var btns = document.getElementsByClassName("btn");
                for (var i = 0, j = btns.length; i < j; i++) {
                    if (btns[i].getAttribute("id") == null) {
                        btns[i].setAttribute("id", "tmpBtnId" + i);
                    }
                    addToElementClassList(btns[i].getAttribute("id"), ["disabled"]);
                };

                // reset the scoreLabel
                removeFromElementClassList("scoreLabel", ["label-success", "label-warning", "label-danger"])  

                // disable the contenteditable span
                var inputSpan = document.getElementById("inputSpan");
                inputSpan.setAttribute("contenteditable", "false");
                inputSpan.innerHTML = $ctrl.answer;

                // Makes sure that the div with the invalid words are hidden
                addToElementClassList("invalidWordsDiv", ["hidden"]);

                if (!$ctrl.answer) {
                    $ctrl.answer = "";
                }
                $ctrl.answer = $ctrl.answer.trim();
                $ctrl.correctAnswer = answer;

                // If answer is correct
                if ($ctrl.answer == answer) {
                    addToElementClassList("scoreLabel", ["label-success"]);
                    addToElementClassList("correctAnswerLabel", ["label-success"]);
                    $ctrl.score++;
                }
                else { // if answer is incorrect 
                    // Checks if there are any invalid words
                    if ($ctrl.invalidWords && $ctrl.invalidWords.length) {
                        $ctrl.score--;
                        addToElementClassList("scoreLabel", ["label-danger"]);
                        addToElementClassList("correctAnswerLabel", ["label-danger"]);
                    }
                    else {
                        addToElementClassList("scoreLabel", ["label-warning"]);
                        addToElementClassList("correctAnswerLabel", ["label-warning"]);
                    }
                }

                timer = $interval(getNewRandomQuestion, 1000);
            };

            // Will be called when controller div is initialised
            $ctrl.init = function () {
                removeFromElementClassList("sentenceDiv", ["hidden"]);
                
                $ctrl.score = 0;
                $ctrl.count = 0;

                // with database and webapi
                //getData();

                // without database
                originalSentences = [
                    "I scream, you scream, we all scream for ice cream.",
                    "How many boards could the Mongols hoard if the Mongol hordes got bored?",
                    "This is madness!",
                    "How much wood would a woodchuck chuck if a woodchuck could chuck wood?",
                    "A woodchuck would chuck as much wood as a woodchuck could chuck if a woodchuck could chuck wood.",
                    "Peter Piper picked a peck of pickled peppers.",
                    "A peck of pickled peppers Peter Piper picked.",
                    "Where's the peck of pickled peppers Peter Piper picked?",
                    "How can a clam cram in a clean cream can?",
                    "Send toast to ten tense stout saints' ten tall tents.",
                    "Can you can a can as a canner can can a can?",
                    "You cuss, I cuss, we all cuss, for asparagus!",
                    "Picky people pick Peter Pan Peanut-Butter, 'tis the peanut-butter picky people pick."
                ];
                sentences = shuffleArray(angular.copy(originalSentences));
                $ctrl.maxCount = 2;
                removeFromElementClassList("startBtn", ["disabled"]);            
            };

            $ctrl.startQuiz = function () {
                // if someone messed with the value of maxCount
                if(isNaN($ctrl.maxCount) || $ctrl.maxCount < 1)
                {
                    $ctrl.maxCount = 2;
                }
                getRandomQuestion();
                timer = $interval($ctrl.checkAnswer, time);
                addToElementClassList("startBtnDiv", ["hidden"]);
                removeFromElementClassList("quizDiv", ["hidden"]);
            };

            $ctrl.restart = function() {
                addToElementClassList("resultDiv", ["hidden"]);
                removeFromElementClassList("startBtnDiv", ["hidden"]);
                removeFromElementClassList("submitBtn", ["disabled"]);
                // Re-enable the contenteditable span
                var inputSpan = document.getElementById("inputSpan");
                inputSpan.innerHTML = "";
                inputSpan.setAttribute("contenteditable", "true");
                $ctrl.init();
            };
    }]);

    // To make ng-model and ng-change work with contenteditable elements
    app.directive("contenteditable", function () {
        return {
            require: "ngModel",
            restrict: "A",
            link: function (scope, element, attrs, ngModel) {

                function update() {
                    // To force the click event to fire when hitting enter, isntead of adding <div><br></div>, and other weird stuff
                    // Doesn't check if
                    var html = element.html();
                    var index = index = html.indexOf("<div>");
                    if (index >= 0) {
                        element.html(html.substring(0, index));
                        angular.element(document.getElementById("sentenceDiv")).scope().$ctrl.checkAnswer();
                    }

                    ngModel.$setViewValue(element.html());
                }

                element.on("keyup", update);

                scope.$on("$destroy", function () {
                    element.off("keyup", update);
                });

                ngModel.$render = function () {
                    element.html(ngModel.$viewValue || "");
                };
            }
        };
    });
})();