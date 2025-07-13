// popup.js
import { initDB, addMemo, getAllMemos, getMemo, deleteMemo } from './db.js';

document.addEventListener('DOMContentLoaded', async () => {
  // DB 초기화를 시작 시점에 한 번만 수행
  try {
    await initDB();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    alert('Failed to initialize database. Please reload the extension.');
    return;
  }

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
  const detailUrl = document.getElementById('detail-url');
  const detailContent = document.getElementById('detail-content');
  const detailDownloadBtn = document.getElementById('detail-download-btn');
  const detailDeleteBtn = document.getElementById('detail-delete-btn');
  const detailObsidianBtn = document.getElementById('detail-obsidian-btn');

  let currentMemoId = null;

  // HTML 이스케이프 함수 추가
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function switchToListView() {
    formView.classList.add('hidden');
    detailView.classList.add('hidden');
    listView.classList.remove('hidden');
    currentMemoId = null;
    renderMemos();
  }

  function switchToFormView() {
    listView.classList.add('hidden');
    detailView.classList.add('hidden');
    formView.classList.remove('hidden');
    memoForm.reset();
    memoIdInput.value = '';

    // pickaxeQuickMemo가 있으면 본문/URL 자동 입력만 하고 저장은 하지 않음
    chrome.storage.local.get('pickaxeQuickMemo', (result) => {
      const quick = result.pickaxeQuickMemo;
      if (quick && quick.content) {
        memoContent.value = quick.content;
        memoUrlInput.value = quick.url || '';
        memoSource.value = quick.url || '';
        // 사용 후 삭제
        chrome.storage.local.remove('pickaxeQuickMemo');
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
      currentMemoId = memoId;
      detailTitle.textContent = memo.title || 'Untitled';
      // URL을 더 명확하게 표시
      detailUrl.textContent = memo.url || '';
      detailContent.textContent = memo.content;
      detailView.classList.remove('hidden');
    } else {
      // Memo not found, go back to list
      switchToListView();
    }
  }

  async function renderMemos() {
    memoListContainer.innerHTML = '';
    
    try {
      const memos = await getAllMemos();

      if (memos.length === 0) {
        memoListContainer.innerHTML = '<p>No memos saved.</p>';
        return;
      }

    memos.forEach(memo => {
      const div = document.createElement('div');
      div.className = 'memo-item';
      div.dataset.id = memo.id;
      div.innerHTML = `
        <div class="memo-item-header">
          <div class="memo-item-content-wrapper">
            <div class="memo-item-title">${escapeHtml(memo.title || 'Untitled')}</div>
            <div class="memo-item-url">${escapeHtml(memo.url || '')}</div>
          </div>
          <div class="memo-item-actions">
            <button class="button-icon download-btn" data-id="${memo.id}" title="Markdown Download" aria-label="Download as Markdown">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M2 10V12.67C2 13.4 2.6 14 3.33 14H12.67C13.4 14 14 13.4 14 12.67V10M4.67 6.67L8 10M8 10L11.33 6.67M8 10V2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="button-danger delete-btn" data-id="${memo.id}" title="Delete" aria-label="Delete memo">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M2 4h12M4 4v10h8V4M6 2h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="memo-item-content">${escapeHtml(memo.content.substring(0, 150))}${memo.content.length > 150 ? '...' : ''}</div>
        <div class="memo-item-bottom">
          <button class="obsidian-btn" data-id="${memo.id}">Add to Obsidian</button>
        </div>
      `;
      memoListContainer.appendChild(div);
    });
    } catch (error) {
      console.error('Failed to render memos:', error);
      memoListContainer.innerHTML = '<p>Error loading memos. Please reload the extension.</p>';
    }
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
    const titlePart = `# ${memo.title || 'Untitled'}`;
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
    // 약간의 지연 후 URL 해제하여 다운로드 완료 보장
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  async function handleAddToObsidian(memoId) {
    console.log("handleAddToObsidian called for memoId:", memoId);

    const { obsidianVault, obsidianFolder } = await chrome.storage.sync.get(['obsidianVault', 'obsidianFolder']);
    console.log("Retrieved vault name:", obsidianVault);
    console.log("Retrieved folder path:", obsidianFolder);

    if (!obsidianVault) {
      alert('Obsidian Vault name is not configured. Please set it up in the extension options page.');
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

    const titlePart = `# ${memo.title || 'Untitled'}`;
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

  async function handleDelete(memoId) {
    if (confirm('Are you sure you want to delete this memo?')) {
      await deleteMemo(memoId);
      if (currentMemoId === memoId) {
        switchToListView();
      } else {
        renderMemos();
      }
    }
  }

  // Event listeners
  memoListContainer.addEventListener('click', async (e) => {
    const target = e.target;
    const memoItem = target.closest('.memo-item');
    const memoId = Number(memoItem?.dataset.id);

    if (!memoItem || isNaN(memoId)) return;

    // Handle button clicks
    if (target.tagName === 'BUTTON') {
      if (target.classList.contains('delete-btn')) {
        handleDelete(memoId);
      } else if (target.classList.contains('download-btn')) {
        handleDownload(memoId);
      } else if (target.classList.contains('obsidian-btn')) {
        handleAddToObsidian(memoId);
      }
      return;
    }
    
    // Handle click on memo item to see detail
    if (!target.closest('button')) {
      switchToDetailView(memoId);
    }
  });

  // Detail view button handlers
  detailDownloadBtn.addEventListener('click', () => {
    if (currentMemoId) {
      handleDownload(currentMemoId);
    }
  });

  detailDeleteBtn.addEventListener('click', () => {
    if (currentMemoId) {
      handleDelete(currentMemoId);
    }
  });

  detailObsidianBtn.addEventListener('click', () => {
    if (currentMemoId) {
      handleAddToObsidian(currentMemoId);
    }
  });

  // Detail URL click handler - open link in new tab
  detailUrl.addEventListener('click', () => {
    const url = detailUrl.textContent.trim();
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      chrome.tabs.create({ url: url });
    }
  });

  newMemoBtn.addEventListener('click', switchToFormView);
  backToListBtn.addEventListener('click', switchToListView);
  backToListFromDetailBtn.addEventListener('click', switchToListView);
  
  memoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitButton = memoForm.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    
    try {
      submitButton.disabled = true;
      submitButton.textContent = 'Saving...';
      
      const memo = {
        title: memoTitle.value,
        content: memoContent.value, // Now only user's note
        url: memoUrlInput.value,
        createdAt: new Date().toISOString()
      };
      
      await addMemo(memo);
      switchToListView();
    } catch (error) {
      console.error('Failed to save memo:', error);
      alert('Failed to save memo. Please try again.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  });

  // popup이 열릴 때 pickaxeQuickMemo가 있으면 바로 입력 화면으로 진입
  chrome.storage.local.get('pickaxeQuickMemo', (result) => {
    if (result.pickaxeQuickMemo && result.pickaxeQuickMemo.content) {
      switchToFormView();
      return;
    }
    // 기본은 리스트 뷰
    switchToListView();
  });
}); 