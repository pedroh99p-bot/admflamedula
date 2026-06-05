/**
 * Componente Toast nativo para exibir notificações rápidas.
 */
export function showToast(message, type = 'success') {
  // Cria o container do toast se não existir
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  // Cria a notificação
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  // Adiciona ao container
  container.appendChild(toast);

  // Trigger reflow para iniciar animação
  setTimeout(() => toast.classList.add('show'), 10);

  // Remove após 3 segundos
  setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 3000);
}
