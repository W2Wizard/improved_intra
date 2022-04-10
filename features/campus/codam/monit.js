/* ************************************************************************** */
/*                                                                            */
/*                                                        ::::::::            */
/*   monit.js                                           :+:    :+:            */
/*                                                     +:+                    */
/*   By: fbes <fbes@student.codam.nl>                 +#+                     */
/*                                                   +#+                      */
/*   Created: 2021/11/11 19:23:05 by fbes          #+#    #+#                 */
/*   Updated: 2022/03/28 19:22:39 by fbes          ########   odam.nl         */
/*                                                                            */
/* ************************************************************************** */

/*
for checking if user has corrected anything
implement in the future
'/users/{user_id}/scale_teams/as_corrected'
https://github.com/troplolBE/bettercorrectors#sample-1
*/

// used in Array.reduce
function sum(prevVal, curVal) {
	return (prevVal + curVal);
}

const monit = {
	httpReq: null,
	requirements: {
		today: 205,
		min: 1440,
		achievement1: 3000,
		achievement2: 4800
	},
	bhContainer: null,
	logTimes: [],
	logTimesTotal: 0,
	username: "me",

	/**
	 * Get the dates of this week's days
	 */
	getWeekDates: function() {
		const thisWeek = [];
		for (let i = 0; i <= dayOfWeek; i++) {
			thisWeek.push(new Date(today.getTime() - 86400000 * i).toISOString().split("T")[0]);
		}
		iConsole.log("This week's dates: ", thisWeek);
		return (thisWeek);
	},

	/**
	 * Get the expectations for this week, based on the minutes the user has currently
	 * and how many days are left. The required minutes left are expected to be spread
	 * out, equally divided over all remaining days.
	 */
	setExpected: function() {
		const logTimesNoToday = this.logTimes.slice(1);
		let logTimesTotalNoToday;

		if (logTimesNoToday && logTimesNoToday.length > 0) {
			logTimesTotalNoToday = logTimesNoToday.reduce(sum);
		}
		else {
			logTimesTotalNoToday = 0;
		}
		if (dayOfWeek == 7 || this.logTimesTotal > this.requirements.min) {
			this.requirements.today = this.requirements.min;
		}
		else {
			this.requirements.today = logTimesTotalNoToday + Math.round((this.requirements.min - logTimesTotalNoToday) / (7 - dayOfWeek));
		}
		iConsole.log("Logtime up until today", logTimesTotalNoToday);
		iConsole.log("Expected minutes today", this.requirements.today - logTimesTotalNoToday);
		iConsole.log("Expected minutes after today", this.requirements.today);
	},

	/**
	 * Get a user's logtime from the web and parse it into the logtime array
	 */
	getLogTimesWeb: function(username) {
		return (new Promise(function(resolve, reject) {
			if (monit.httpReq != null) {
				monit.httpReq.abort();
			}
			monit.httpReq = new XMLHttpRequest();
			monit.httpReq.addEventListener("load", function() {
				try {
					const stats = JSON.parse(this.responseText);
					const weekDates = monit.getWeekDates();
					monit.logTimes = [];
					for (let i = 0; i < weekDates.length; i++) {
						if (weekDates[i] in stats) {
							monit.logTimes.push(parseLogTime(stats[weekDates[i]]));
						}
						else {
							monit.logTimes.push(0);
						}
					}
					if (monit.logTimes && monit.logTimes.length > 0) {
						monit.logTimesTotal = monit.logTimes.reduce(sum);
					}
					else {
						monit.logTimesTotal = 0;
					}
					resolve();
				}
				catch (err) {
					reject(err);
				}
			});
			monit.httpReq.addEventListener("error", function(err) {
				reject(err);
			});
			monit.httpReq.open("GET", window.location.origin + "/users/" + username + "/locations_stats.json");
			monit.httpReq.send();
		}));
	},

	/**
	 * Get the progress towards the Monitoring System's goals from the current webpage.
	 * The logtime data is read from the SVG logtime chart, but in case that fails there's
	 * a fallback available to read from the web instead.
	 */
	getProgress: function() {
		if (window.location.pathname.indexOf("/users/") == 0) {
			// user profile. check if user loaded is from Amsterdam campus
			// if not, do not display monitoring system progress (return)
			const iconLocation = document.getElementsByClassName("icon-location");
			if (iconLocation.length == 0) {
				return;
			}
			if (iconLocation[0].nextSibling.nextSibling.textContent != "Amsterdam") {
				return;
			}
		}
		this.bhContainer = document.getElementById("goals_container");
		if (!this.bhContainer) {
			return;
		}
		if (window.location.pathname == "/") {
			// dashboard page. check if user logged in is from Amsterdam campus
			// if not, do not display monitoring system progress (return)
			// check by checking the school record button, should contain Codam
			// if the button is not there (before handing in Libft), check coalition
			const schoolRecordButton = document.querySelector(".school-record-button");
			if (schoolRecordButton) {
				const srFormData = document.getElementsByName("sr_id");
				if (srFormData.length > 0) {
					if (srFormData[0].textContent.indexOf("Codam") == -1) {
						return;
					}
				}
				else {
					return;
				}
			}
			else {
				const coalitionName = document.querySelector(".coalition-name .coalition-span");
				if (coalitionName) {
					if (["Pyxis", "Vela", "Cetus"].indexOf(coalitionName.textContent) == -1) {
						return;
					}
				}
				else {
					return;
				}
			}
		}
		this.getLogTimesWeb(getProfileUserName()).then(this.writeProgress).catch(function(err) {
			iConsole.error("Could not retrieve logtimes for Codam Monitoring System progress", err);
		});
	},

	/**
	 * Get the status of the monitoring system from the server.
	 * Monitoring system could be disabled.
	 * See server/campus_specifics/codam/monit_status.php
	 */
	getStatus: function() {
		return new Promise(function(resolve, reject) {
			if (monit.httpReq != null) {
				monit.httpReq.abort();
			}
			monit.httpReq = new XMLHttpRequest();
			monit.httpReq.addEventListener("load", function() {
				try {
					const status = JSON.parse(this.responseText);
					resolve(status);
				}
				catch (err) {
					reject(err);
				}
			});
			monit.httpReq.addEventListener("error", function(err) {
				reject(err);
			});
			monit.httpReq.open("GET", "https://darkintra.freekb.es/campus_specifics/codam/monit_status.json");
			monit.httpReq.send();
		});
	},

	/**
	 * Write the progress data to the Black Hole box
	 */
	writeProgress: function() {
		monit.getStatus().then(function(status) {
			monit.setExpected();
			iConsole.log("Logtimes", monit.logTimes);
			iConsole.log("Total minutes", monit.logTimesTotal);

			const aguDate = document.getElementById("agu-date");
			if (aguDate && aguDate.className.indexOf("hidden") == -1) {
				return;
			}

			let atLeastRelaxed = false;
			const partTimeCheck = document.querySelectorAll("a.project-item.block-item[href*='part_time'][data-cursus='42cursus']");
			if (partTimeCheck.length > 0 || status["monitoring_system_active"] === false) {
				iConsole.log("User is working on Part-Time project or monitoring system is currently disabled, emote will be at least relaxed");
				atLeastRelaxed = true;
			}

			const availableStatus = document.querySelector(".user-poste-status");
			if (availableStatus && availableStatus.innerText == "Available") {
				iConsole.log("User is currently available, emote will be at least relaxed");
				atLeastRelaxed = true;
			}

			for (let i = 0; i < monit.bhContainer.children.length; i++) {
				monit.bhContainer.children[i].style.display = "none";
			}

			const progressNode = document.createElement("div");
			progressNode.setAttribute("id", "monit-progress");

			const progressTitle = document.createElement("div");
			progressTitle.setAttribute("class", "mb-1");

			const coalitionSpan = document.createElement("span");
			coalitionSpan.setAttribute("class", "coalition-span");
			coalitionSpan.style.color = getCoalitionColor();
			coalitionSpan.innerText = "Monitoring System progress";

			progressTitle.appendChild(coalitionSpan);
			progressNode.appendChild(progressTitle);

			const progressText = document.createElement("div");
			progressText.setAttribute("id", "monit-progress-text");

			const ltHolder = document.createElement("div");
			ltHolder.setAttribute("id", "lt-holder");
			ltHolder.setAttribute("class", "emote-lt");
			ltHolder.setAttribute("data-toggle", "tooltip");
			ltHolder.setAttribute("title", "");

			const smiley = document.createElement("span");
			smiley.setAttribute("id", "lt-emote");

			const progressPerc = document.createElement("span");
			if (status["monitoring_system_active"]) {
				progressPerc.innerText = Math.floor(monit.logTimesTotal / 1440 * 100) + "% complete";
				ltHolder.setAttribute("data-original-title", "Logtime this week: " + logTimeToString(monit.logTimesTotal));
			}
			else if (status["work_from_home_required"] && !status["monitoring_system_active"]) {
				// covid-19 message
				progressPerc.innerText = "Don't give up!";
				ltHolder.setAttribute("data-original-title", "You can do this! Codam will at some point reopen again. I'm sure of it! Times will get better.");
			}
			else if (!status["monitoring_system_active"]) {
				progressPerc.innerText = logTimeToString(monit.logTimesTotal);
				ltHolder.setAttribute("data-original-title", "Logtime this week (Monitoring System is currently disabled)");
			}

			if (monit.logTimesTotal < monit.requirements.today && !atLeastRelaxed) {
				smiley.setAttribute("class", "icon-smiley-sad-1");
				smiley.setAttribute("style", "color: var(--danger-color);");
				progressPerc.setAttribute("style", "color: var(--danger-color);");
			}
			else if ((atLeastRelaxed && monit.logTimesTotal < monit.requirements.min) || (!atLeastRelaxed && monit.logTimesTotal < monit.requirements.min)) {
				smiley.setAttribute("class", "icon-smiley-relax");
				smiley.setAttribute("style", "color: var(--warning-color);");
				progressPerc.setAttribute("style", "color: var(--warning-color);");
			}
			else if (monit.logTimesTotal < monit.requirements.achievement1) {
				smiley.setAttribute("class", "icon-smiley-happy-3");
				smiley.setAttribute("style", "color: var(--success-color);");
				progressPerc.setAttribute("style", "color: var(--success-color);");
			}
			else if (monit.logTimesTotal < monit.requirements.achievement2) {
				smiley.setAttribute("class", "icon-smiley-happy-5");
				smiley.setAttribute("style", "color: var(--success-color);");
				progressPerc.setAttribute("style", "color: var(--success-color);");
			}
			else {
				smiley.setAttribute("class", "icon-smiley-surprise");
				smiley.setAttribute("style", "color: var(--success-color);");
				progressPerc.setAttribute("style", "color: var(--success-color);");
			}

			// profile easter egg: use a certain emote on certain user pages
			switch (monit.username) {
				case "fbes":
					smiley.setAttribute("data-oclass", smiley.getAttribute("class"));
					smiley.setAttribute("class", "iconf-canon");
					break;
				case "lde-la-h":
					smiley.setAttribute("data-oclass", smiley.getAttribute("class"));
					smiley.setAttribute("class", "iconf-cactus");
					break;
				case "jgalloni":
					smiley.setAttribute("data-oclass", smiley.getAttribute("class"));
					smiley.setAttribute("class", "iconf-bug-1");
					break;
				case "ieilat":
					smiley.setAttribute("data-oclass", smiley.getAttribute("class"));
					smiley.setAttribute("class", "iconf-pacman-ghost");
					break;
				case "pde-bakk":
					smiley.setAttribute("data-oclass", smiley.getAttribute("class"));
					smiley.setAttribute("class", "iconf-crown-1");
					break;
				case "pvan-dij":
					smiley.setAttribute("data-oclass", smiley.getAttribute("class"));
					smiley.setAttribute("class", "iconf-milk");
					break;
			}
			smiley.addEventListener("click", function() {
				if (!smiley.getAttribute("data-oclass")) {
					return;
				}
				const tempClass = smiley.getAttribute("class");
				smiley.setAttribute("class", smiley.getAttribute("data-oclass"));
				smiley.setAttribute("data-oclass", tempClass);
			});
			ltHolder.appendChild(smiley);
			ltHolder.appendChild(progressPerc);

			progressText.appendChild(ltHolder);

			progressNode.appendChild(progressText);

			monit.bhContainer.appendChild(progressNode);
			monit.bhContainer.className = monit.bhContainer.className.replace("hidden", "");
			addToolTip("#lt-holder");
		});
	},
};

improvedStorage.get("codam-monit").then(function(data) {
	if (data["codam-monit"] === true || data["codam-monit"] === "true") {
		monit.getProgress();
	}
});