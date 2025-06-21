// options.js
document.addEventListener('DOMContentLoaded', () => {
  const optionsForm = document.getElementById('options-form');
  const vaultInput = document.getElementById('obsidian-vault');
  const statusMessage = document.getElementById('status-message');

  // Load saved vault name
  chrome.storage.sync.get(['obsidianVault'], (result) => {
    if (result.obsidianVault) {
      vaultInput.value = result.obsidianVault;
    }
  });

  // Save vault name
  optionsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const vaultName = vaultInput.value;
    if (!vaultName) return;

    chrome.storage.sync.set({ obsidianVault: vaultName }, () => {
      statusMessage.textContent = '저장되었습니다!';
      setTimeout(() => {
        statusMessage.textContent = '';
      }, 2000);
    });
  });
}); 