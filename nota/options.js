// options.js
document.addEventListener('DOMContentLoaded', () => {
  const optionsForm = document.getElementById('options-form');
  const vaultInput = document.getElementById('obsidian-vault');
  const folderInput = document.getElementById('obsidian-folder');
  const statusMessage = document.getElementById('status-message');

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
    const vaultName = vaultInput.value;
    const folderName = folderInput.value.trim();

    if (!vaultName) return;

    chrome.storage.sync.set({ 
      obsidianVault: vaultName,
      obsidianFolder: folderName
    }, () => {
      statusMessage.textContent = '저장되었습니다!';
      setTimeout(() => {
        statusMessage.textContent = '';
      }, 2000);
    });
  });
}); 