console.log("popup loaded");

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Toolbar button clicked");
  const mainElement = document.getElementById("main");
  mainElement.textContent = "popup js working";
});
