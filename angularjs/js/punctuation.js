(function () {

    var app = angular.module("punctuationExercise", [])
        .controller("punctuationController", ["$http", "$interval", function ($http, $interval) {
            var $ctrl = this;
            var answer;
            var originalSentences = [];
            var sentences = [];
            var timer = null;
            var time = 15000;
            var punctuationMarks = ["'", ".", ",", "?", "!"];

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

            // Changes .,?! to *
            var obscurePunctuation = function (arr) {
                return arr.replace(/[’'´`.,?!]/g, "*");
            };

            // Gets a new random question
            var getRandomQuestion = function () {
                //checks if we have any questions left, otherwise we simply make new ones
                if (sentences.length <= 0) {
                    sentences = shuffleArray(angular.copy(originalSentences));
                }

                answer = sentences.pop();
                $ctrl.answer = obscurePunctuation(answer);

                $ctrl.punctuationMarks = shuffleArray(punctuationMarks);

                // Checks if the sentence contains certain punctuation marks that can make it rather ambiguous, and then edits the list of marks to make it more clear
                filterAmbiguousPunctuationMarks($ctrl.punctuationMarks);
            };

            // Shuffles an array (duh)
            var shuffleArray = function (arr) {
                arr = angular.copy(arr);
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

            // filter out ambigous marks to make the answers clearer
            var filterAmbiguousPunctuationMarks = function (arr) {
                if (correctContains(".") && !correctContains("!")) {
                    arr.splice(arr.indexOf("!"), 1, ";");
                }
                else if (!correctContains(".") && correctContains("!")) {
                    arr.splice(arr.indexOf("."), 1, ";");
                }
            };

            // checks if the correct answer contains the mark
            var correctContains = function (mark) {
                if (answer && answer.length) {
                    return answer.indexOf(mark) >= 0;
                }
                return false;
            };
            // Checks if a word is unique in the sentence
            var isUnique = function (mark) {
                var num = 0;
                for (var i = 0, j = answer.length; i < j; i++) {
                    if (answer[i] == mark) {
                        num++;
                    }
                    if ($ctrl.answer[i] == mark) {
                        num--;
                    }
                };
                return num == 0;
            };
            // Checks if a word is in the right place
            var inRightPlace = function (mark) {
                if (!$ctrl.answer) {
                    $ctrl.answer = "";
                }
                if (!answer) {
                    answer = "";
                }
                var index = $ctrl.answer.lastIndexOf(mark);

                return answer[index] == mark;
            };
            // Checks if the answer contains the current word
            var answerContains = function (mark) {
                if ($ctrl.answer && $ctrl.answer.length) {
                    return $ctrl.answer.indexOf(mark) >= 0;
                }
                return false;
            };

            // will be called 1 second after $ctrl.checkAnswer()
            var getNewRandomQuestion = function () {
                // Fix things
                $interval.cancel(timer);
                removeFromElementClassList("correctAnswerLabel", ["label-success", "label-warning", "label-danger"])
                $ctrl.correctAnswer = null;
                answer = "";
                $ctrl.answer = "";

                // return
                if ($ctrl.count < $ctrl.maxCount-1) {
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
                // re-enable all the buttons
                var btns = document.getElementsByClassName("btn");
                for (var i = 0, j = btns.length; i < j; i++) {
                    if (btns[i].getAttribute("id") == null) {
                        btns[i].setAttribute("id", "tmpBtnId" + i);
                    }
                    removeFromElementClassList(btns[i].getAttribute("id"), ["disabled"]);
                };
            };
            // Gets the sentences from the database
            var getData = function () {
                $http.get("/api/sentences/get")
                    .then(function (response) {
                        originalSentences = response.data;
                        sentences = shuffleArray(angular.copy(originalSentences));
                        removeFromElementClassList("startBtn", ["disabled"]);

                        // If random quiz
                        if (sessionStorage.loopList != null) {
                            addToElementClassList("startBtn", ["hidden"]);
                            removeFromElementClassList("quizDiv", ["hidden"]);
                            getRandomQuestion();

                            // 10 seconds until it automatically goes to a new question
                            timer = $interval($ctrl.checkAnswer, time);
                        }
                    });
            };

            //############ Accessible from the markup ############//

            // more variables
            $ctrl.punctuationMarks = [];
            $ctrl.pageTitle = "Punctuation Exercise!";
            $ctrl.pageDesc = [
                "Use the buttons to switch the asterisk marks (*) with the correct punctuation marks, you have 15 seconds to answer.",
                "You get 1 point for every correct sentence!"
            ];

            // functions to set the colour of the buttons
            $ctrl.isGreen = function (word) {
                return answerContains(word) && inRightPlace(word) && isUnique(word);
            };
            $ctrl.isBlue = function (word) {
                return answerContains(word) && inRightPlace(word) && !isUnique(word);
            };
            $ctrl.isOrange = function (word) {
                return answerContains(word) && !inRightPlace(word) && correctContains(word);
            };
            $ctrl.isWhite = function (word) {
                return !answerContains(word);
            };
            $ctrl.isRed = function (word) {
                return !correctContains(word) && !$ctrl.isWhite(word);
            };

            // TODO: fix
            // Update the answer when clicking the word buttons
            $ctrl.updateAnswer = function (mark) {
                if ($ctrl.isOrange(mark) || $ctrl.isRed(mark)) {
                    $ctrl.answer = $ctrl.answer.replace(mark, "*");
                }
                else if(!$ctrl.isGreen(mark)) {
                    $ctrl.answer = $ctrl.answer.replace("*", mark);
                }

                // check if the answer is correct
                if ($ctrl.answer == answer) {
                    $ctrl.checkAnswer();
                }
            };

            // Check the answer
            $ctrl.checkAnswer = function () {
                // cancel old timer
                $interval.cancel(timer);

                // disable all the buttons
                var btns = document.getElementsByClassName("btn");
                for (var i = 0, j = btns.length; i < j; i++) {
                    if (btns[i].getAttribute("id") == null) {
                        btns[i].setAttribute("id", "tmpBtnId" + i);
                    }
                    addToElementClassList(btns[i].getAttribute("id"), ["disabled"]);
                };

                // reset scoreLabel
                removeFromElementClassList("scoreLabel", ["label-success", "label-warning", "label-danger"])

                $ctrl.correctAnswer = answer;

                // If answer is correct
                if ($ctrl.answer === answer) {
                    //removeFromElementClassList("labelCorrect", ["hidden"]);
                    addToElementClassList("scoreLabel", ["label-success"]);
                    addToElementClassList("correctAnswerLabel", ["label-success"]);
                    $ctrl.score++;
                }
                else { // if answer is incorrect 
                    addToElementClassList("scoreLabel", ["label-warning"]);
                    addToElementClassList("correctAnswerLabel", ["label-warning"]);
                }
                // start new timer
                timer = $interval(getNewRandomQuestion, 1000);
            };

            // Starts the quiz (duh)
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
                $ctrl.init();
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
        }]);
})();