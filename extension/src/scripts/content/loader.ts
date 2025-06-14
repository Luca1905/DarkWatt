const script: HTMLScriptElement = document.createElement('script');
script.src = chrome.runtime.getURL('content/script.js');
(document.head || document.documentElement).appendChild(script);
script.onload = function () {
  script.remove();
};

