// popup.js
import { initDB, addMemo, getAllMemos, getMemo, deleteMemo } from './db.js';

document.addEventListener('DOMContentLoaded', () => {
  const listView = document.getElementById('list-view');
  const formView = document.getElementById('form-view');
  const detailView = document.getElementById('detail-view');

  const memoListContainer = document.getElementById('memo-list-container');
  const newMemoBtn = document.getElementById('new-memo-btn');
  const backToListBtn = document.getElementById('back-to-list-btn');
  
  const memoForm = document.getElementById('memo-form');
  const memoTitle = document.getElementById('memo-title');
  const memoSource = document.getElementById('memo-source');
  const memoContent = document.getElementById('memo-content');
  const memoUrlInput = document.getElementById('memo-url');
  const memoIdInput = document.getElementById('memo-id');

  const backToListFromDetailBtn = document.getElementById('back-to-list-from-detail-btn');
  const detailTitle = document.getElementById('detail-title');
  const detailContent = document.getElementById('detail-content');

  function switchToListView() {
    formView.classList.add('hidden');
    detailView.classList.add('hidden');
    listView.classList.remove('hidden');
    renderMemos();
  }

  function switchToFormView() {
    listView.classList.add('hidden');
    detailView.classList.add('hidden');
    formView.classList.remove('hidden');
    memoForm.reset();
    memoIdInput.value = '';

    // notaQuickMemo가 있으면 본문/URL 자동 입력만 하고 저장은 하지 않음
    chrome.storage.local.get('notaQuickMemo', (result) => {
      const quick = result.notaQuickMemo;
      if (quick && quick.content) {
        memoContent.value = quick.content;
        memoUrlInput.value = quick.url || '';
        memoSource.value = quick.url || '';
        // 사용 후 삭제
        chrome.storage.local.remove('notaQuickMemo');
        memoContent.focus();
        return;
      }
      // PRD: 현재 웹페이지 URL 자동 첨부 & 본문 포커스
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url && tabs[0].url.startsWith('http')) {
          const url = tabs[0].url;
          memoUrlInput.value = url;
          memoSource.value = url;
          memoContent.value = '';
        }
        memoContent.focus();
      });
    });
  }

  async function switchToDetailView(memoId) {
    listView.classList.add('hidden');
    formView.classList.add('hidden');
    
    const memo = await getMemo(memoId);
    if (memo) {
      detailTitle.textContent = memo.title || '제목 없음';
      const fullContent = `Source: ${memo.url}\n\n${memo.content}`;
      detailContent.textContent = fullContent;
      detailView.classList.remove('hidden');
    } else {
      // Memo not found, go back to list
      switchToListView();
    }
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
      div.dataset.id = memo.id;
      div.innerHTML = `
        <div class="memo-item-header">
          <div class="memo-item-title">${memo.title || '제목 없음'}</div>
        </div>
        <div class="memo-item-source">${memo.url || ''}</div>
        <div class="memo-item-content">${memo.content.substring(0, 80)}...</div>
        <div class="memo-item-actions">
           <button class="obsidian-btn" data-id="${memo.id}">Add to Obsidian</button>
           <button class="download-btn" data-id="${memo.id}">.md 다운로드</button>
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
    const fileContent = `${titlePart}\n${urlPart}\n\n${memo.content}`;

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
    const urlPart = `Source: ${memo.url}`;
    const fileContent = `${titlePart}\n${urlPart}\n\n${memo.content}`;
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
    const target = e.target;
    const memoId = Number(target.closest('.memo-item')?.dataset.id);

    if (!memoId) return;

    // Handle button clicks
    if (target.tagName === 'BUTTON') {
      if (target.classList.contains('delete-btn')) {
        if (confirm('정말로 이 메모를 삭제하시겠습니까?')) {
          await deleteMemo(memoId);
          renderMemos();
        }
      } else if (target.classList.contains('download-btn')) {
        handleDownload(memoId);
      } else if (target.classList.contains('obsidian-btn')) {
        handleAddToObsidian(memoId);
      }
      return;
    }
    
    // Handle click on memo item to see detail
    switchToDetailView(memoId);
  });

  newMemoBtn.addEventListener('click', switchToFormView);
  backToListBtn.addEventListener('click', switchToListView);
  backToListFromDetailBtn.addEventListener('click', switchToListView);
  
  memoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const memo = {
      title: memoTitle.value,
      content: memoContent.value, // Now only user's note
      url: memoUrlInput.value,
      createdAt: new Date().toISOString()
    };
    
    await addMemo(memo);
    switchToListView();
  });

  // popup이 열릴 때 notaQuickMemo가 있으면 바로 입력 화면으로 진입
  chrome.storage.local.get('notaQuickMemo', (result) => {
    if (result.notaQuickMemo && result.notaQuickMemo.content) {
      switchToFormView();
      return;
    }
    // 기본은 리스트 뷰
    switchToListView();
  });
}); 