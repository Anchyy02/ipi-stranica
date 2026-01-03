(function(){
  function ready(fn){ if(document.readyState!='loading'){ fn(); } else { document.addEventListener('DOMContentLoaded', fn); } }

  var THEME_STORAGE_KEY = 'themeId';

  function getDefaultThemeId(){
    try {
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'blue';
    } catch(_){
      return 'blue';
    }
  }

  async function loadThemes(){
    try {
      var res = await fetch('/themes.json', { cache: 'no-cache' });
      if(!res.ok) throw new Error('HTTP ' + res.status);
      var json = await res.json();
      return Array.isArray(json && json.themes) ? json.themes : [];
    } catch(e){
      console.warn('projekat-prvi: Failed to load /themes.json', e);
      return [];
    }
  }

  function applyCssVars(vars){
    var root = document.documentElement;
    Object.keys(vars || {}).forEach(function(key){
      if(key && key.indexOf('--') === 0){
        root.style.setProperty(key, String(vars[key]));
      }
    });
  }

  function applyTheme(themeId, themes){
    var root = document.documentElement;
    root.setAttribute('data-theme', themeId);
    if(themeId === 'dark') root.classList.add('dark-mode');
    else root.classList.remove('dark-mode');

    var match = null;
    for(var i=0;i<(themes||[]).length;i++){
      if(themes[i] && themes[i].id === themeId){ match = themes[i]; break; }
    }
    if(match && match.vars){
      applyCssVars(match.vars);
    }
  }

  async function initTheme(){
    var themes = await loadThemes();
    var stored = null;
    try { stored = localStorage.getItem(THEME_STORAGE_KEY); } catch(_) {}
    var themeId = stored || getDefaultThemeId();
    applyTheme(themeId, themes);
  }

  function isToolsPage(){
    if(document.body && document.body.hasAttribute('data-tools')) return true;
    // Default: only on Student Fun Zone host page
    try { return /StudentFunZone\.html$/i.test(location.pathname); } catch(_) { return false; }
  }

  function createTools(){
    if(!isToolsPage()) return; // don't show everywhere
    var article = document.querySelector('article');
    if(!article) return;
    if(article.querySelector('.page-tools')) return;
    var tools = document.createElement('div');
    tools.className = 'page-tools';
    tools.innerHTML = '\n      <button type="button" id="btnPrint">Snimi kao PDF</button>\n      <button type="button" id="btnEmail">Pošalji mailom</button>\n    ';
    article.insertBefore(tools, article.firstChild);

    document.getElementById('btnPrint').addEventListener('click', function(){ window.print(); });
    document.getElementById('btnEmail').addEventListener('click', openEmailModal);
  }

  function injectModal(){
    if(document.querySelector('.modal-overlay')) return;
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '\n      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="emailTitle">\n        <h3 id="emailTitle">Pošalji sadržaj mailom</h3>\n        <div class="row">\n          <label for="emailTo">Email adresa</label>\n          <input type="email" id="emailTo" placeholder="npr. student@example.com" required />\n        </div>\n        <div class="row">\n          <label for="emailSubject">Subject (opcionalno)</label>\n          <input type="text" id="emailSubject" placeholder="Naslov poruke" />\n        </div>\n        <div class="actions">\n          <button type="button" id="emailCancel">Poništi</button>\n          <button type="button" id="emailSend">Pošalji</button>\n        </div>\n      </div>';
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e){ if(e.target === overlay){ closeEmailModal(); } });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ closeEmailModal(); } });

    document.getElementById('emailCancel').addEventListener('click', closeEmailModal);
    document.getElementById('emailSend').addEventListener('click', function(){
      var email = document.getElementById('emailTo').value.trim();
      var subject = document.getElementById('emailSubject').value.trim() || (document.title + ' – IPI Akademija');
      if(!/^\S+@\S+\.\S+$/.test(email)){
        alert('Unesite ispravnu email adresu.');
        return;
      }
      var article = document.querySelector('article');
      var content = article ? article.innerText : document.body.innerText;
      // Trim to avoid very long mailto
      var max = 1500;
      if(content.length > max){ content = content.slice(0, max) + '\n...'; }
      var body = 'URL: ' + location.href + '\n\nSadržaj stranice:\n\n' + content;
      var mailto = 'mailto:' + encodeURIComponent(email)
                 + '?subject=' + encodeURIComponent(subject)
                 + '&body=' + encodeURIComponent(body);
      // Open mailto via temporary anchor for better compatibility
      try {
        var a = document.createElement('a');
        a.href = mailto;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(function(){ a.remove(); }, 0);
      } catch(e){
        // Fallback
        window.location.href = mailto;
      }
      closeEmailModal();
    });
  }

  function openEmailModal(){
    var overlay = document.querySelector('.modal-overlay');
    if(!overlay) return;
    overlay.style.display = 'flex';
    var emailInput = document.getElementById('emailTo');
    if(emailInput){ emailInput.focus(); }
  }
  function closeEmailModal(){
    var overlay = document.querySelector('.modal-overlay');
    if(overlay){ overlay.style.display = 'none'; }
  }

  function enhanceDropdown(){
    // Student Fun Zone should only be visible/used in the Angular app.
    return;
    var nav = document.querySelector('nav ul');
    if(!nav) return;
    // Find the li containing Student Fun Zone
    var items = nav.querySelectorAll('li');
    var targetLi = null;
    items.forEach(function(li){
      var a = li.querySelector('a');
      if(a && /Student Fun Zone/i.test(a.textContent)){ targetLi = li; }
    });
    if(!targetLi) return;
    if(targetLi.classList.contains('has-dropdown')) return;
    targetLi.classList.add('has-dropdown');

    var submenu = document.createElement('ul');
    var entries = [
      { text: 'Bingo', view: 'bingo' },
      { text: 'Kviz', view: 'kviz' },
      { text: 'Interaktivni Whiteboard', view: 'whiteboard' },
      { text: 'Visual Board', view: 'visual' },
      { text: 'Kanban Board', view: 'kanban' }
    ];
    entries.forEach(function(item){
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = 'StudentFunZone.html?view=' + encodeURIComponent(item.view);
      a.textContent = item.text;
      li.appendChild(a);
      submenu.appendChild(li);
    });
    targetLi.appendChild(submenu);

    // Click-to-toggle so menu doesn't close when moving cursor
    var trigger = targetLi.querySelector('a');
    if(trigger){
      trigger.setAttribute('aria-haspopup', 'true');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.addEventListener('click', function(e){
        // Toggle open state, don't navigate on toggle
        e.preventDefault();
        var open = targetLi.classList.toggle('open');
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      trigger.addEventListener('keydown', function(e){
        if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); trigger.click(); }
      });
    }

    // Close when clicking outside
    document.addEventListener('click', function(e){
      if(!targetLi.contains(e.target)){
        if(targetLi.classList.contains('open')){
          targetLi.classList.remove('open');
          if(trigger) trigger.setAttribute('aria-expanded', 'false');
        }
      }
    });
  }

  function initFunZoneRouter(){
    // Student Fun Zone should only be visible/used in the Angular app.
    return;
    var container = document.getElementById('funzone-container');
    if(!container) return; // Only on StudentFunZone

    var params = new URLSearchParams(window.location.search);
    var view = params.get('view');
    var map = {
      bingo: 'funzone/bingo.html',
      kviz: 'funzone/kviz.html',
      whiteboard: 'funzone/whiteboard.html',
      visual: 'funzone/visual.html',
      kanban: 'funzone/kanban.html'
    };
    var src = map[view];
    if(!src){ src = map['visual']; }
    var iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.title = 'Student Fun Zone – ' + view;
    iframe.style.width = '100%';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    // Fixed height per view - no dynamic resizing
    var heights = {
      'visual': '740px',
      'whiteboard': '720px',
      'bingo': '700px',
      'kviz': '700px',
      'kanban': '700px'
    };
    iframe.style.height = heights[view] || '700px';
    container.innerHTML = '';
    container.appendChild(iframe);
  }

  async function updateNavAuth(){
    var nav = document.querySelector('nav ul');
    if(!nav) return;
    
    // projekat-prvi should NOT show profile/logout; only Angular handles that.
    // It should always show the Login link.
    // Clean up any leftovers from older versions.
    var existingProfile = nav.querySelector('#auth-profile');
    var existingLogout = nav.querySelector('#auth-logout');
    var existingLogin = null;
    
    var items = nav.querySelectorAll('li');
    items.forEach(function(li){
      var a = li.querySelector('a');
      if(a && (/login\.html$/i.test(a.href) || /Login/i.test(a.textContent))){ 
        existingLogin = li; 
      }
    });

    if(existingProfile) existingProfile.parentElement.remove();
    if(existingLogout) existingLogout.parentElement.remove();

    // Ensure login link exists (always)
    if(!existingLogin){
      var loginLi = document.createElement('li');
      var loginLink = document.createElement('a');
      loginLink.href = 'login.html';
      loginLink.textContent = 'Login';
      loginLi.appendChild(loginLink);
      nav.appendChild(loginLi);
    }
  }

  ready(async function(){
    await initTheme();
    createTools();
    injectModal();
    enhanceDropdown();
    initFunZoneRouter();
    
    if(typeof firebase !== 'undefined' && firebase.auth){
      await updateNavAuth();
      
      firebase.auth().onAuthStateChanged(async () => {
        await updateNavAuth();
      });
    }
  });
})();