// popup.js
import { initDB, addMemo, getAllMemos, getMemo, deleteMemo } from './db.js';

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
    
    // PRD: 현재 웹페이지 URL 자동 첨부 & 본문 포커스
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url && tabs[0].url.startsWith('http')) {
        const url = tabs[0].url;
        memoUrlInput.value = url;
        memoContent.value = `Source : ${url}\n\n`;
      }
      
      // PRD: 커서는 본문 필드에 자동 포커스
      memoContent.focus();
      // 커서를 내용의 맨 끝으로 이동
      memoContent.setSelectionRange(memoContent.value.length, memoContent.value.length);
    });
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
           <button class="download-btn" data-id="${memo.id}">다운로드</button>
           <button class="obsidian-btn" data-id="${memo.id}">Obsidian</button>
           <button class="button-danger delete-btn" data-id="${memo.id}">삭제</button>
        </div>
      `;
      memoListContainer.appendChild(div);
    });
  }

  async function handleDownload(memoId) {
    const memo = await getMemo(memoId);
    if (!memo) return;

    // 1. 파일명 생성 (yyyy-mm-dd_hhmm_slug.md)
    const date = new Date(memo.createdAt);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const slug = (memo.title || 'untitled').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const fileName = `${yyyy}-${mm}-${dd}_${hh}${min}_${slug}.md`;

    // 2. 파일 내용 생성 (# 제목\n> URL\n\n본문)
    const titlePart = `# ${memo.title || '제목 없음'}`;
    const urlPart = `> ${memo.url}`;
    const bodyOnly = memo.content.replace(/Source : .*\n\n?/, ''); // Source: 라인 제거
    const fileContent = `${titlePart}\n${urlPart}\n\n${bodyOnly}`;

    // 3. 다운로드 실행
    const blob = new Blob([fileContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleAddToObsidian(memoId) {
    console.log("handleAddToObsidian called for memoId:", memoId);

    const { obsidianVault, obsidianFolder } = await chrome.storage.sync.get(['obsidianVault', 'obsidianFolder']);
    console.log("Retrieved vault name:", obsidianVault);
    console.log("Retrieved folder path:", obsidianFolder);

    if (!obsidianVault) {
      alert('Obsidian Vault 이름이 설정되지 않았습니다. 확장 프로그램 옵션 페이지에서 설정해주세요.');
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open(chrome.runtime.getURL('options.html'));
      }
      return;
    }

    const memo = await getMemo(memoId);
    console.log("Retrieved memo data:", memo);

    if (!memo) {
      console.error("Could not find memo with id:", memoId);
      return;
    }

    const date = new Date(memo.createdAt);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const slug = (memo.title || 'untitled').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    let path = '';
    if (obsidianFolder) {
      // remove leading/trailing slashes and then add a single trailing slash
      path = obsidianFolder.replace(/^\/|\/$/g, '') + '/';
    }
    const fileName = `${yyyy}-${mm}-${dd}_${slug}.md`;
    const fullPath = `${path}${fileName}`;
    console.log("Generated full path:", fullPath);

    const titlePart = `# ${memo.title || '제목 없음'}`;
    const urlPart = `> Source: ${memo.url}`;
    const bodyOnly = memo.content.replace(/Source : .*\n\n?/, '');
    const fileContent = `${titlePart}\n${urlPart}\n\n${bodyOnly}`;
    console.log("Generated file content:", fileContent);
    
    const encodedVault = encodeURIComponent(obsidianVault);
    const encodedFile = encodeURIComponent(fullPath);
    const encodedContent = encodeURIComponent(fileContent);

    const obsidianUri = `obsidian://new?vault=${encodedVault}&file=${encodedFile}&content=${encodedContent}`;
    console.log("Constructed Obsidian URI:", obsidianUri);
    
    if (obsidianUri.length > 2000) {
        console.warn("Obsidian URI is very long and might be truncated by the browser or OS.", { length: obsidianUri.length });
    }
    
    chrome.tabs.create({ url: obsidianUri });
  }

  memoListContainer.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const memoId = Number(e.target.dataset.id);
      if (confirm('정말로 이 메모를 삭제하시겠습니까?')) {
        await deleteMemo(memoId);
        renderMemos();
      }
    } else if (e.target.classList.contains('download-btn')) {
      const memoId = Number(e.target.dataset.id);
      handleDownload(memoId);
    } else if (e.target.classList.contains('obsidian-btn')) {
      const memoId = Number(e.target.dataset.id);
      handleAddToObsidian(memoId);
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