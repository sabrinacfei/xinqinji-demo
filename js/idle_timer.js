(function(){
  let idleTimer, warnTimer;
  const IDLE_MS = 60000;
  const WARN_MS = 10000;

  function resetTimer(){
    clearTimeout(idleTimer);
    clearTimeout(warnTimer);
    removeWarning();
    idleTimer = setTimeout(showWarning, IDLE_MS);
  }

  function showWarning(){
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
      location.href = 'index.html';
    });

    warnTimer = setTimeout(() => {
      location.href = 'index.html';
    }, WARN_MS);
  }

  function removeWarning(){
    document.getElementById('idleWarningBox')?.remove();
  }

  ['click','touchstart','pointerdown','keydown'].forEach(ev => {
    document.addEventListener(ev, resetTimer, true);
  });

  resetTimer();
})();
