(function () {

    var app = angular.module("punctuationExercise", [])
        .controller("punctuationController", ["$http", "$interval", function ($http, $interval) {
            var vm = this;
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
                vm.answer = obscurePunctuation(answer);

                vm.punctuationMarks = shuffleArray(punctuationMarks);

                // Checks if the sentence contains certain punctuation marks that can make it rather ambiguous, and then edits the list of marks to make it more clear
                filterAmbiguousPunctuationMarks(vm.punctuationMarks);
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
                    if (vm.answer[i] == mark) {
                        num--;
                    }
                };
                return num == 0;
            };
            // Checks if a word is in the right place
            var inRightPlace = function (mark) {
                if (!vm.answer) {
                    vm.answer = "";
                }
                if (!answer) {
                    answer = "";
                }
                var index = vm.answer.lastIndexOf(mark);

                return answer[index] == mark;
            };
            // Checks if the answer contains the current word
            var answerContains = function (mark) {
                if (vm.answer && vm.answer.length) {
                    return vm.answer.indexOf(mark) >= 0;
                }
                return false;
            };

            // will be called 1 second after vm.checkAnswer()
            var getNewRandomQuestion = function () {
                // Fix things
                $interval.cancel(timer);
                removeFromElementClassList("correctAnswerLabel", ["label-success", "label-warning", "label-danger"])
                vm.correctAnswer = null;
                answer = "";
                vm.answer = "";

                // return
                if (vm.count == vm.Maxcount) {
                    if (sessionStorage.loopList != null && sessionStorage.loopList.length > 1) {
                        var adress = sessionStorage.loopList.slice(0, sessionStorage.loopList.indexOf("/")) // becomes the first adress without the '/'
                        sessionStorage.loopList = sessionStorage.loopList.slice(sessionStorage.loopList.indexOf("/") + 1); // removes that first adress and the '/'
                        document.location.href = document.location.href.slice(0, document.location.href.indexOf("/Home")) + "/Home/" + adress; // sets the webpage to Home/adress
                    }
                    else {
                        document.location.href = document.location.href.slice(0, document.location.href.indexOf("/Home")); // just goes back 
                    }
                }
                else {
                    getRandomQuestion();

                    // re-enable all the buttons
                    var btns = document.getElementsByClassName("btn");
                    for (var i = 0, j = btns.length; i < j; i++) {
                        if (btns[i].getAttribute("id") == null) {
                            btns[i].setAttribute("id", "tmpBtnId" + i);
                        }
                        removeFromElementClassList(btns[i].getAttribute("id"), ["disabled"]);
                    };

                    // new timer
                    timer = $interval(vm.checkAnswer, time);
                }
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
                            timer = $interval(vm.checkAnswer, time);
                        }
                    });
            };

            //############ Accessible from the markup ############//

            // more variables
            vm.punctuationMarks = [];
            vm.score = 0;
            vm.count = 0;
            vm.pageTitle = "Punctuation Exercise!";
            vm.pageDesc = [
                "Use the buttons to switch the asterisk marks (*) with the correct punctuation marks, you have 15 seconds to answer.",
                "You get 1 point for every correct sentence!"
            ];

            // functions to set the colour of the buttons
            vm.isGreen = function (word) {
                return answerContains(word) && inRightPlace(word) && isUnique(word);
            };
            vm.isBlue = function (word) {
                return answerContains(word) && inRightPlace(word) && !isUnique(word);
            };
            vm.isOrange = function (word) {
                return answerContains(word) && !inRightPlace(word) && correctContains(word);
            };
            vm.isWhite = function (word) {
                return !answerContains(word);
            };
            vm.isRed = function (word) {
                return !correctContains(word) && !vm.isWhite(word);
            };

            // TODO: fix
            // Update the answer when clicking the word buttons
            vm.updateAnswer = function (mark) {
                if (vm.isOrange(mark) || vm.isRed(mark)) {
                    vm.answer = vm.answer.replace(mark, "*");
                }
                else if(!vm.isGreen(mark)) {
                    vm.answer = vm.answer.replace("*", mark);
                }

                // check if the answer is correct
                if (vm.answer == answer) {
                    vm.checkAnswer();
                }
            };

            // Check the answer
            vm.checkAnswer = function () {
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

                vm.correctAnswer = answer;
                vm.count++;

                // If answer is correct
                if (vm.answer === answer) {
                    //removeFromElementClassList("labelCorrect", ["hidden"]);
                    addToElementClassList("scoreLabel", ["label-success"]);
                    addToElementClassList("correctAnswerLabel", ["label-success"]);
                    vm.score++;
                }
                else { // if answer is incorrect 
                    addToElementClassList("scoreLabel", ["label-warning"]);
                    addToElementClassList("correctAnswerLabel", ["label-warning"]);
                }
                // start new timer
                timer = $interval(getNewRandomQuestion, 1000);
            };

            // Starts the quiz (duh)
            vm.startQuiz = function () {
                addToElementClassList("startBtn", ["hidden"]);
                removeFromElementClassList("quizDiv", ["hidden"]);
                getRandomQuestion();
                timer = $interval(vm.checkAnswer, time);
            };
            
            // Will be called when controller div is initialised
            vm.init = function () {
                removeFromElementClassList("sentenceDiv", ["hidden"]);
                vm.Maxcount = sessionStorage.punctuationVar;
                getData();
            };
        }]);
})();