console.log("popup loaded");

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded");
  const mainElement = document.getElementById("main");
  mainElement.textContent = "what";
});