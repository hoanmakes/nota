// background.js (service worker)
// ... existing code ... 

// PRD id: memo.clip_selection - P1
// 우클릭 컨텍스트 메뉴 생성
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "captureWithNota",
    title: "nota로 캡처",
    contexts: ["selection"]
  });
});

// 컨텍스트 메뉴 클릭 리스너
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "captureWithNota") {
    // 선택된 텍스트와 URL을 임시 저장 후 팝업을 여는 로직 (향후 구현)
    console.log("Selected text:", info.selectionText);
    console.log("Page URL:", info.pageUrl);
    // 1. chrome.storage.local에 selectionText 저장
    // 2. chrome.windows.create()로 popup.html을 작은 창으로 열거나,
    //    사용자가 팝업을 열 때 storage를 확인하여 내용을 채우도록 유도
  }
});


// PRD id: memo.hotkey - P1
// 단축키 명령 리스너
chrome.commands.onCommand.addListener((command) => {
  if (command === "_execute_action") {
    // 툴바의 확장 아이콘을 클릭하는 것과 동일한 효과
    // 이 부분은 manifest.json의 "commands" 설정과 연동되어 동작합니다.
    // 사용자가 Alt+N을 누르면 팝업이 열립니다.
    console.log("Action executed by command.");
  }
}); 