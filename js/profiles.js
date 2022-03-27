/* ************************************************************************** */
/*                                                                            */
/*                                                        ::::::::            */
/*   profiles.js                                        :+:    :+:            */
/*                                                     +:+                    */
/*   By: fbes <fbes@student.codam.nl>                 +#+                     */
/*                                                   +#+                      */
/*   Created: 2022/01/09 01:01:42 by fbes          #+#    #+#                 */
/*   Updated: 2022/02/07 21:05:47 by fbes          ########   odam.nl         */
/*                                                                            */
/* ************************************************************************** */

// from https://stackoverflow.com/questions/8667070/javascript-regular-expression-to-validate-url (jesus)
function validateUrl(value) {
	return /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(value);
}

function getProfileUserName() {
	try {
		return (document.querySelector(".login[data-login]").getAttribute("data-login"));
	}
	catch (err) {
		return (null);
	}
}

var gUName = null;
var gProfileBanner = null;
var gInterval = null;
var gExtSettings = null;
var gUserSettings = null;

function getUserSettings(username) {
	return new Promise(function(resolve, reject) {
		if (gUserSettings && gUserSettings["username"] === username) {
			resolve(gUserSettings);
			return;
		}
		console.log("Retrieving settings of username " + username);
		fetch("https://darkintra.freekb.es/settings/" + username + ".json?noCache=" + Math.random())
			.then(function(response) {
				if (response.status == 404) {
					console.log("No settings found on the sync server for this username");
					return null;
				}
				else if (!response.ok) {
					throw new Error("Could not get settings from server due to an error");
				}
				return response.json();
			})
			.then(function(json) {
				if (json == null) {
					reject();
				}
				else {
					gUserSettings = json;
					resolve(json);
				}
			})
			.catch(function(err) {
				reject(err);
			});
	});
}


function setCustomBanner(imageUrl, imagePos) {
	if (imageUrl && validateUrl(imageUrl)) {
		var newCSSval = "url(\"" + imageUrl + "\")";
		if (gProfileBanner.style.backgroundImage.indexOf(imageUrl) == -1) {
			gProfileBanner.className += " customized";
			gProfileBanner.setAttribute("data-old-bg", gProfileBanner.style.backgroundImage);
			gProfileBanner.style.backgroundImage = newCSSval;
			switch (imagePos) {
				default:
				case "center-center":
					gProfileBanner.style.backgroundPosition = "center center";
					break;
				case "center-top":
					gProfileBanner.style.backgroundPosition = "center top";
					break;
				case "center-bottom":
					gProfileBanner.style.backgroundPosition = "center bottom";
					break;
			}
			console.log("Custom banner set!");
		}
		return (true);
	}
	return (false);
}

function unsetCustomBannerIfRequired() {
	if (gProfileBanner.getAttribute("data-old-bg")) {
		gProfileBanner.style.backgroundImage = gProfileBanner.getAttribute("data-old-bg");
		gProfileBanner.removeAttribute("data-old-bg");
		console.log("Custom banner unset");
	}
}

function setGitHubLink(gitHubName) {
	gitHubName = gitHubName.trim();
	var gitHubLink = document.getElementById("ii-profile-link-github");
	if (gitHubLink) {
		if (gitHubName.indexOf("@") == 0) {
			gitHubName = gitHubName.substring(1);
		}
		else if (gitHubName.indexOf("http://") == 0 || gitHubName.indexOf("https://") == 0) {
			if (gitHubName.endsWith("/")) {
				gitHubName = gitHubName.split("/");
				gitHubName = gitHubName[gitHubName.length - 2];
			}
			else {
				gitHubName = gitHubName.split("/").pop();
			}
		}
		gitHubLink.innerText = gitHubName;
		gitHubLink.parentNode.setAttribute("href", "https://www.github.com/" + gitHubName);
		gitHubLink.parentNode.parentNode.style.display = "block";
	}
}

function setCustomBannerWrapper() {
	if (gExtSettings["show-custom-profiles"] === true || gExtSettings["show-custom-profiles"] === "true") {
		if (gProfileBanner) {
			if (gUName == gExtSettings["username"]) {
				if (!setCustomBanner(gExtSettings["custom-banner-url"], gExtSettings["custom-banner-pos"])) {
					unsetCustomBannerIfRequired();
				}
			}
			else {
				getUserSettings(gUName)
					.then(function(uSettings) {
						if (!setCustomBanner(uSettings["custom-banner-url"], uSettings["custom-banner-pos"])) {
							unsetCustomBannerIfRequired();
						}
					})
					.catch(function(err) {
						// no custom profile settings found
					});
			}
		}
	}
}

function setCustomProfile() {
	if (gExtSettings["show-custom-profiles"] === true || gExtSettings["show-custom-profiles"] === "true") {
		if (gProfileBanner) {
			if (gUName == gExtSettings["username"]) {
				if (gExtSettings["link-github"] && gExtSettings["link-github"].trim() != "") {
					setGitHubLink(gExtSettings["link-github"]);
				}
			}
			else {
				getUserSettings(gUName)
					.then(function(uSettings) {
						if (uSettings["link-github"] && uSettings["link-github"].trim() != "") {
							setGitHubLink(uSettings["link-github"]);
						}
					})
					.catch(function(err) {
						// no custom profile settings found
					});
			}
		}
	}
}

function immediateProfileChanges() {
	// easter egg for user fbes, even when customized profiles are disabled
	if (gProfileBanner && gUName == "fbes") {
		gProfileBanner.className += " egg";
	}

	if (window.location.pathname.indexOf("/users/") == 0) {
		// improvements to profile boxes
		var locations = document.getElementById("locations");
		if (locations) {
			var logTimesHeader = document.createElement("h4");
			logTimesHeader.className = "profile-title";
			logTimesHeader.innerText = "Logtime";
			locations.parentNode.parentNode.prepend(logTimesHeader);
		}

		// add social links to profile
		var userInfos = document.querySelector(".profile-infos-bottom");
		if (userInfos) {
			var gitHubItem = document.createElement("div");
			gitHubItem.className = "profile-infos-item";
			gitHubItem.setAttribute("id", "ii-profile-link-c-github");
			gitHubItem.setAttribute("data-placement", "left");
			gitHubItem.setAttribute("data-toggle", "tooltip");
			gitHubItem.setAttribute("title", "GitHub");
			gitHubItem.setAttribute("data-original-title", "GitHub");
			gitHubItem.style.display = "none";

			var gitHubIcon = document.createElement("span");
			gitHubIcon.className = "fa fa-github";
			gitHubItem.appendChild(gitHubIcon);

			var gitHubLink = document.createElement("a");
			gitHubLink.style.marginLeft = "4px";
			gitHubLink.style.color = getCoalitionColor();
			gitHubLink.setAttribute("target", "_blank");
			gitHubItem.appendChild(gitHubLink);

			var gitHubName = document.createElement("span");
			gitHubName.className = "coalition-span";
			gitHubName.setAttribute("id", "ii-profile-link-github");
			gitHubLink.appendChild(gitHubName);

			var locationItem = userInfos.querySelector(".icon-location");
			if (locationItem) {
				locationItem = locationItem.parentNode;
				userInfos.insertBefore(gitHubItem, locationItem);
			}
			else {
				userInfos.appendChild(gitHubItem);
			}

			var evt = new CustomEvent("add-tooltip", { detail: "#ii-profile-link-c-github" });
			document.dispatchEvent(evt);
		}
	}
}

// check if the custom profile is kept in an interval for 5 seconds
// sometimes things get overruled by coalition stuff, such as banners
function confirmProfileUpdatedForFiveSeconds() {
	if (!gInterval) {
		gInterval = setInterval(setCustomBannerWrapper, 150);
		setTimeout(function() {
			clearInterval(gInterval);
			gInterval = null;
		}, 5000);
	}
}

gUName = getProfileUserName();
gProfileBanner = document.querySelector(".container-inner-item.profile-item-top.profile-banner");
immediateProfileChanges();
improvedStorage.get(["username", "show-custom-profiles", "custom-banner-url", "custom-banner-pos", "link-github"]).then(function(data) {
	gExtSettings = data;
	setCustomBannerWrapper();
	setCustomProfile();
	confirmProfileUpdatedForFiveSeconds();
});

var cursusSelector = document.querySelector(".cursus-user-select");
if (cursusSelector) {
	cursusSelector.addEventListener("change", function(event) {
		confirmProfileUpdatedForFiveSeconds();
	});
}
