// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const listView = document.getElementById('list-view');
  const formView = document.getElementById('form-view');
  const memoListContainer = document.getElementById('memo-list-container');
  const newMemoBtn = document.getElementById('new-memo-btn');
  const backToListBtn = document.getElementById('back-to-list-btn');
  const memoForm = document.getElementById('memo-form');
  const memoTitle = document.getElementById('memo-title');
  const memoContent = document.getElementById('memo-content');
  const memoUrlInput = document.getElementById('memo-url');
  const memoIdInput = document.getElementById('memo-id');

  function switchToListView() {
    formView.classList.add('hidden');
    listView.classList.remove('hidden');
    renderMemos();
  }

  function switchToFormView() {
    listView.classList.add('hidden');
    formView.classList.remove('hidden');
    memoForm.reset();
    memoIdInput.value = '';
    
    // PRD: 현재 웹페이지 URL 자동 첨부
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        memoUrlInput.value = tabs[0].url;
      }
    });

    // PRD: 커서는 본문 필드에 자동 포커스
    memoContent.focus();
  }

  async function renderMemos() {
    memoListContainer.innerHTML = '';
    const memos = await getAllMemos();

    if (memos.length === 0) {
      memoListContainer.innerHTML = '<p>저장된 메모가 없습니다.</p>';
      return;
    }

    memos.forEach(memo => {
      const div = document.createElement('div');
      div.className = 'memo-item';
      div.innerHTML = `
        <div class="memo-item-header">
          <div class="memo-item-title">${memo.title || '제목 없음'}</div>
        </div>
        <div class="memo-item-content">${memo.content.substring(0, 100)}...</div>
        <div class="memo-item-actions">
           <button class="button-danger delete-btn" data-id="${memo.id}">삭제</button>
        </div>
      `;
      memoListContainer.appendChild(div);
    });
  }

  memoListContainer.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const memoId = Number(e.target.dataset.id);
      if (confirm('정말로 이 메모를 삭제하시겠습니까?')) {
        await deleteMemo(memoId);
        renderMemos();
      }
    }
  });

  newMemoBtn.addEventListener('click', switchToFormView);
  backToListBtn.addEventListener('click', switchToListView);

  memoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const memo = {
      title: memoTitle.value,
      content: memoContent.value,
      url: memoUrlInput.value,
      createdAt: new Date().toISOString()
    };
    
    await addMemo(memo);
    switchToListView();
  });
  
  // Initialize
  initDB().then(renderMemos);
}); 