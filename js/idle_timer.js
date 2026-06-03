(function(){
  let idleTimer, warnTimer, idleActive = false;
  const IDLE_MS = 15000;
  const WARN_MS = 5000;
  const HOME_URL = 'index.html';

  function isHomePage(){
    const path = window.location.pathname.split('/').pop();
    return path === '' || path === HOME_URL;
  }

  function hasOpenModal(){
    return Boolean(
      document.body.classList.contains('modal-open') ||
      document.querySelector('.modal.show') ||
      document.querySelector('.modal[style*="display: block"]') ||
      document.querySelector('.sumOverlay:not(.d-none)')
    );
  }

  function shouldAskIdle(){
    return !isHomePage() || hasOpenModal();
  }

  function stopTimer(){
    clearTimeout(idleTimer);
    clearTimeout(warnTimer);
    removeWarning();
    idleActive = false;
  }

  function resetTimer(){
    clearTimeout(idleTimer);
    clearTimeout(warnTimer);
    removeWarning();

    if(!shouldAskIdle()) {
      stopTimer();
      return;
    }

    idleActive = true;
    idleTimer = setTimeout(showWarning, IDLE_MS);
  }

  function syncTimerState(){
    const shouldAsk = shouldAskIdle();

    if(!shouldAsk) {
      stopTimer();
      return;
    }

    if(!idleActive) resetTimer();
  }

  function showWarning(){
    if(!shouldAskIdle()) {
      resetTimer();
      return;
    }

    if(document.getElementById('idleWarningBox')) return;

    const box = document.createElement('div');
    box.id = 'idleWarningBox';
    box.innerHTML = `
      <div id="idleWarningCard">
        <div id="idleWarningMsg">請問是否繼續使用？</div>
        <div id="idleWarningBtns">
          <button id="idleYesBtn">是</button>
          <button id="idleNoBtn">否</button>
        </div>
      </div>
    `;
    document.body.appendChild(box);

    document.getElementById('idleYesBtn').addEventListener('click', () => {
      resetTimer();
    });

    document.getElementById('idleNoBtn').addEventListener('click', () => {
      location.href = HOME_URL;
    });

    warnTimer = setTimeout(() => {
      location.href = HOME_URL;
    }, WARN_MS);
  }

  function removeWarning(){
    document.getElementById('idleWarningBox')?.remove();
  }

  ['click','touchstart','pointerdown','keydown'].forEach(ev => {
    document.addEventListener(ev, (event) => {
      if(event.target.closest?.('#idleWarningBox')) return;
      resetTimer();
    }, true);
  });

  ['shown.bs.modal','hidden.bs.modal'].forEach(ev => {
    document.addEventListener(ev, syncTimerState);
  });

  const observer = new MutationObserver((records) => {
    const modalStateChanged = records.some(record => {
      const target = record.target;
      return target === document.body ||
        target.classList?.contains('modal') ||
        target.classList?.contains('sumOverlay');
    });

    if(modalStateChanged) syncTimerState();
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class', 'style'],
    subtree: true
  });

  resetTimer();
})();
