function SlideEngine(){
    this.deck=document.querySelector('.deck');
    this.slides=[].slice.call(document.querySelectorAll('.slide'));
    this.current=0;
    this.total=this.slides.length;
    this.storeKey='ve:'+location.pathname;
    this.buildChrome();
    this.bindEvents();
    this.observe();
    this.restore();
    this.update();
  }
  SlideEngine.prototype.titleOf=function(i){
    var s=this.slides[i];var el=s.querySelector('.slide__display,.slide__heading,blockquote,.slide__kpi-label');
    var t=el?el.textContent.trim().replace(/\s+/g,' '):''; if(!t){var n=s.querySelector('.slide__number');t=n?'Section '+n.textContent.trim():'Slide '+(i+1);} return t.length>54?t.slice(0,52)+'\u2026':t;
  };
  SlideEngine.prototype.buildChrome=function(){
    var self=this;
    var bar=document.createElement('div');bar.className='deck-progress';document.body.appendChild(bar);this.bar=bar;
    var dots=document.createElement('div');dots.className='deck-dots';
    this.slides.forEach(function(_,i){var d=document.createElement('button');d.className='deck-dot';d.title=self.titleOf(i);d.onclick=function(){self.goTo(i);};dots.appendChild(d);});
    document.body.appendChild(dots);this.dots=[].slice.call(dots.children);
    var ctr=document.createElement('div');ctr.className='deck-counter';document.body.appendChild(ctr);this.counter=ctr;
    var hints=document.createElement('div');hints.className='deck-hints';hints.textContent='\u2190 \u2192 \u00b7 O outline \u00b7 ? help';document.body.appendChild(hints);this.hints=hints;
    this.hintTimer=setTimeout(function(){hints.classList.add('faded');},4500);
    // overlay (outline + help share one panel)
    var ov=document.createElement('div');ov.setAttribute('style','position:fixed;inset:0;z-index:200;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55);backdrop-filter:blur(3px)');
    var panel=document.createElement('div');panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Outline');
    panel.setAttribute('style','max-height:80vh;overflow:auto;width:min(560px,86vw);background:var(--surface,#162040);color:var(--text,#e8e4d8);border:1px solid var(--border-bright,rgba(200,180,140,.16));border-radius:14px;padding:18px 14px;font-family:var(--font-mono,monospace)');
    ov.appendChild(panel);document.body.appendChild(ov);this.ov=ov;this.panel=panel;
    ov.addEventListener('click',function(e){if(e.target===ov)self.closeOverlay();});
  };
  SlideEngine.prototype.renderOutline=function(){
    var self=this;var h='<div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:.6;margin:2px 8px 12px">Outline</div>';
    this.slides.forEach(function(_,i){
      var act=i===self.current;
      h+='<button data-i="'+i+'" style="display:flex;gap:10px;width:100%;text-align:left;border:none;cursor:pointer;background:'+(act?'var(--accent-dim,rgba(212,167,58,.1))':'transparent')+';color:inherit;padding:8px 10px;border-radius:8px;font-family:inherit;font-size:13px;line-height:1.3"><span style="opacity:.5;min-width:22px">'+(i+1)+'</span><span style="'+(act?'color:var(--accent,#d4a73a)':'')+'">'+self.titleOf(i).replace(/[<>&]/g,function(c){return{'<':'&lt;','>':'&gt;','&':'&amp;'}[c];})+'</span></button>';
    });
    this.panel.innerHTML=h;
    [].slice.call(this.panel.querySelectorAll('button')).forEach(function(b){b.onclick=function(){self.goTo(+b.getAttribute('data-i'));self.closeOverlay();};});
  };
  SlideEngine.prototype.renderHelp=function(){
    this.panel.innerHTML='<div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:.6;margin:2px 8px 14px">Keyboard</div>'+
      [['\u2192 / \u2193 / Space','next'],['\u2190 / \u2191','previous'],['Home / End','first / last'],['O','outline'],['? ','this help'],['Esc','close']].map(function(r){
        return '<div style="display:flex;justify-content:space-between;padding:7px 10px;font-size:13px"><span style="opacity:.7">'+r[1]+'</span><kbd style="background:var(--surface2,#1d2b52);border-radius:5px;padding:2px 8px">'+r[0]+'</kbd></div>';}).join('');
  };
  SlideEngine.prototype.openOverlay=function(mode){this.ov.style.display='flex';mode==='help'?this.renderHelp():this.renderOutline();};
  SlideEngine.prototype.closeOverlay=function(){this.ov.style.display='none';};
  SlideEngine.prototype.bindEvents=function(){
    var self=this;
    document.addEventListener('keydown',function(e){
      if(e.target.closest('.mermaid-wrap,.table-scroll,.code-scroll,input,textarea,[contenteditable]'))return;
      if(e.key==='Escape'){self.closeOverlay();return;}
      var open=self.ov.style.display==='flex';
      if(e.key==='o'||e.key==='O'){e.preventDefault();open?self.closeOverlay():self.openOverlay('outline');return;}
      if(e.key==='?'){e.preventDefault();open?self.closeOverlay():self.openOverlay('help');return;}
      if(open)return;
      if(['ArrowDown','ArrowRight',' ','PageDown'].indexOf(e.key)>-1){e.preventDefault();self.next();}
      else if(['ArrowUp','ArrowLeft','PageUp'].indexOf(e.key)>-1){e.preventDefault();self.prev();}
      else if(e.key==='Home'){e.preventDefault();self.goTo(0);}
      else if(e.key==='End'){e.preventDefault();self.goTo(self.total-1);}
      self.fadeHints();
    });
    window.addEventListener('hashchange',function(){var i=self.fromHash();if(i!=null&&i!==self.current)self.goTo(i);});
    var tY;
    this.deck.addEventListener('touchstart',function(e){tY=e.touches[0].clientY;},{passive:true});
    this.deck.addEventListener('touchend',function(e){var dy=tY-e.changedTouches[0].clientY;if(Math.abs(dy)>50){dy>0?self.next():self.prev();}});
  };
  SlideEngine.prototype.fromHash=function(){var m=/^#(?:slide-)?(\d+)$/.exec(location.hash);if(!m)return null;var i=(+m[1])-1;return(i>=0&&i<this.total)?i:null;};
  SlideEngine.prototype.restore=function(){
    var i=this.fromHash();
    if(i==null){try{var s=localStorage.getItem(this.storeKey);if(s!=null){var j=+s;if(j>0&&j<this.total-1)i=j;}}catch(e){}}
    if(i!=null&&i>0){var self=this;this.current=i;setTimeout(function(){self.slides[i].scrollIntoView();},60);}
  };
  SlideEngine.prototype.observe=function(){
    var self=this;
    var obs=new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.isIntersecting){entry.target.classList.add('visible');self.current=self.slides.indexOf(entry.target);self.update();}});},{threshold:0.5});
    this.slides.forEach(function(s){obs.observe(s);});
  };
  SlideEngine.prototype.goTo=function(i){i=Math.max(0,Math.min(i,this.total-1));this.slides[i].scrollIntoView({behavior:'smooth'});};
  SlideEngine.prototype.next=function(){if(this.current<this.total-1)this.goTo(this.current+1);};
  SlideEngine.prototype.prev=function(){if(this.current>0)this.goTo(this.current-1);};
  SlideEngine.prototype.update=function(){
    var c=this.current,pct=Math.round((c+1)/this.total*100);
    this.bar.style.width=pct+'%';
    this.dots.forEach(function(d,i){d.classList.toggle('active',i===c);});
    this.counter.textContent=(c+1)+' / '+this.total+' \u00b7 '+pct+'%';
    try{history.replaceState(null,'','#slide-'+(c+1));localStorage.setItem(this.storeKey,String(c));}catch(e){}
  };
  SlideEngine.prototype.fadeHints=function(){clearTimeout(this.hintTimer);this.hints.classList.add('faded');};