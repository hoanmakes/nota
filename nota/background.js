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
    const selectionText = info.selectionText || '';
    const pageUrl = info.pageUrl || '';
    // 마크다운 인용구로 가공
    const quoted = selectionText.split('\n').map(line => `> ${line}`).join('\n');
    chrome.storage.local.set({
      notaQuickMemo: {
        content: quoted,
        url: pageUrl
      }
    }, () => {
      // popup.html을 작은 창으로 오픈 (옵션: 480x600)
      chrome.windows.create({
        url: chrome.runtime.getURL('popup.html'),
        type: 'popup',
        width: 480,
        height: 600
      });
    });
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