// options.js
document.addEventListener('DOMContentLoaded', () => {
  const optionsForm = document.getElementById('options-form');
  const vaultInput = document.getElementById('obsidian-vault');
  const folderInput = document.getElementById('obsidian-folder');
  const statusMessage = document.getElementById('status-message');
  const submitButton = optionsForm.querySelector('button[type="submit"]');

  // 상태 메시지 표시 함수
  function showStatusMessage(message, type = 'success') {
    statusMessage.textContent = message;
    statusMessage.className = type;
    statusMessage.style.display = 'block';
    
    setTimeout(() => {
      statusMessage.style.display = 'none';
      statusMessage.className = '';
    }, 3000);
  }

  // 폼 제출 상태 관리
  function setFormSubmitting(isSubmitting) {
    submitButton.disabled = isSubmitting;
    submitButton.textContent = isSubmitting ? 'Saving...' : 'Save Settings';
  }

  // Load saved settings
  chrome.storage.sync.get(['obsidianVault', 'obsidianFolder'], (result) => {
    if (result.obsidianVault) {
      vaultInput.value = result.obsidianVault;
    }
    if (result.obsidianFolder) {
      folderInput.value = result.obsidianFolder;
    }
  });

  // Save settings
  optionsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const vaultName = vaultInput.value.trim();
    const folderName = folderInput.value.trim();

    if (!vaultName) {
      showStatusMessage('Please enter a vault name', 'error');
      vaultInput.focus();
      return;
    }

    setFormSubmitting(true);

    chrome.storage.sync.set({ 
      obsidianVault: vaultName,
      obsidianFolder: folderName
    }, () => {
      setFormSubmitting(false);
      
      if (chrome.runtime.lastError) {
        showStatusMessage('Failed to save settings. Please try again.', 'error');
      } else {
        showStatusMessage('Settings saved successfully!', 'success');
      }
    });
  });

  // 실시간 유효성 검사
  vaultInput.addEventListener('input', () => {
    const isValid = vaultInput.value.trim().length > 0;
    submitButton.disabled = !isValid;
  });
}); 