// 创建并显示toast通知
window.showToast = function(message, type = 'info') {
  // 移除已存在的toast
  const existingToast = document.getElementById('chrome-storage-copier-toast');
  if (existingToast) {
    existingToast.remove();
  }

  // 创建toast元素
  const toast = document.createElement('div');
  toast.id = 'chrome-storage-copier-toast';
  toast.style.cssText = `
    position: fixed;
    top: 16px;
    right: 16px;
    padding: 12px 24px;
    background-color: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
    color: white;
    border-radius: 4px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 14px;
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
  `;
  toast.textContent = message;

  // 添加到页面
  document.body.appendChild(toast);

  // 显示动画
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);

  // 3秒后隐藏
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
};
