(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function sourceOf(...functions){return functions.map(fn=>fn.toString()).join('\n\n');}
function formatCode(source){
  let out='',i=0,indent=0,paren=0,bracket=0,previous='';
  const lineLength=()=>out.length-(out.lastIndexOf('\n')+1);
  const trimEnd=()=>{out=out.replace(/[ \t]+$/,'');};
  const newline=()=>{trimEnd();if(out&&!out.endsWith('\n'))out+='\n';};
  const write=value=>{if(out.endsWith('\n')||!out){out+='  '.repeat(Math.max(0,indent));}out+=value;};
  const quotedEnd=(start,quote)=>{let p=start+1;while(p<source.length){if(source[p]==='\\'){p+=2;continue;}if(source[p]===quote)return p+1;p++;}return p;};
  while(i<source.length){
    const ch=source[i],next=source[i+1];
    if(ch==='\n'){newline();i++;continue;}
    if(/\s/.test(ch)){if(!out.endsWith(' ')&&!out.endsWith('\n'))out+=' ';i++;continue;}
    if(ch==='/'&&next==='/'){let end=source.indexOf('\n',i);if(end<0)end=source.length;write(source.slice(i,end));newline();i=end;previous='comment';continue;}
    if(ch==='/'&&next==='*'){let end=source.indexOf('*/',i+2);end=end<0?source.length:end+2;write(source.slice(i,end));i=end;previous='comment';continue;}
    if(ch==='"'||ch==="'"||ch==='`'){const end=quotedEnd(i,ch);write(source.slice(i,end));i=end;previous='value';continue;}
    const regexMayStart=!previous||/^(=|\(|\[|\{|:|,|;|!|\?|&&|\|\||=>|return|case)$/.test(previous);
    if(ch==='/'&&regexMayStart){let p=i+1,inClass=false;while(p<source.length){if(source[p]==='\\'){p+=2;continue;}if(source[p]==='[')inClass=true;else if(source[p]===']')inClass=false;else if(source[p]==='/'&&!inClass){p++;while(/[a-z]/i.test(source[p]||''))p++;break;}p++;}write(source.slice(i,p));i=p;previous='value';continue;}
    const word=source.slice(i).match(/^[\p{L}_$][\p{L}\p{N}_$]*/u)?.[0];
    if(word){write(word);i+=word.length;previous=word;continue;}
    if(ch==='{'){trimEnd();write(' {');indent++;newline();i++;previous='{';continue;}
    if(ch==='}'){
      newline();indent=Math.max(0,indent-1);write('}');i++;previous='}';
      let look=i;while(/\s/.test(source[look]||''))look++;
      const rest=source.slice(look);
      if(rest.startsWith('else')||rest.startsWith('catch')||rest.startsWith('finally')||rest.startsWith('while'))out+=' ';
      else if(!/^[;,.)\]}]/.test(rest))newline();
      continue;
    }
    if(ch==='('){if(['if','for','while','switch','catch','with'].includes(previous))write(' ');paren++;}
    if(ch===')')paren=Math.max(0,paren-1);if(ch==='[')bracket++;if(ch===']')bracket=Math.max(0,bracket-1);
    if(ch===';'){write(';');i++;previous=';';if(paren===0)newline();continue;}
    if(ch===','){
      write(',');i++;previous=',';
      if(paren===0||lineLength()>92)newline();else out+=' ';
      continue;
    }
    const op=source.slice(i).match(/^(?:===|!==|=>|==|!=|<=|>=|&&|\|\||\?\?|\+\+|--|\+=|-=|\*=|\/=|\?\.|\*\*|[+*/%<>=!&|?-])/)?.[0];
    if(op){if(lineLength()>94&&(op==='&&'||op==='||'||op==='?'))newline();if(op==='++'||op==='--'||op==='?.')write(op);else{trimEnd();write(` ${op} `);}i+=op.length;previous=op;continue;}
    write(ch);i++;previous=ch;
  }
  return out.trim();
}
function highlightCode(source,state={}){
  const keywords=new Set('const let var function return if else for while do switch case break default new delete typeof class this try catch throw async await'.split(' '));
  const core=new Set('const let var if else for while do switch case break default new delete typeof of in'.split(' '));
  const coreOperators=new Set(['+','-','*','/','%','**','==','!=','===','!==','<','>','<=','>=','&&','||','!']);
  const builtins=new Set('document window Array Object Boolean Number String JSON Math Date Map Set BigInt Symbol parseInt parseFloat'.split(' '));
  const members=new Set('getElementById querySelector querySelectorAll addEventListener removeEventListener classList append appendChild remove textContent innerHTML value length map forEach filter find includes push pop shift unshift sort reverse'.split(' '));
  let html='',i=0,previous='';
  const paint=(value,cls)=>`<span class="${cls}">${esc(value)}</span>`;
  const readQuoted=(start,quote)=>{let p=start+1;while(p<source.length){if(source[p]==='\\'){p+=2;continue;}if(source[p]===quote)return p+1;p++;}return p;};
  while(i<source.length){
    const ch=source[i],next=source[i+1];
    if(state.template){let end=i;while(end<source.length){if(source[end]==='\\'){end+=2;continue;}if(source[end]==='`'){end++;break;}end++;}html+=paint(source.slice(i,end),'tok-template');i=end;if(source[end-1]==='`')state.template=false;continue;}
    if(/\s/.test(ch)){html+=ch;i++;continue;}
    if(ch==='/'&&next==='/'){let end=source.indexOf('\n',i);if(end<0)end=source.length;html+=paint(source.slice(i,end),'tok-comment');i=end;previous='comment';continue;}
    if(ch==='/'&&next==='*'){let end=source.indexOf('*/',i+2);end=end<0?source.length:end+2;html+=paint(source.slice(i,end),'tok-comment');i=end;previous='comment';continue;}
    if(ch==='"'||ch==="'"){const end=readQuoted(i,ch);html+=paint(source.slice(i,end),'tok-string');i=end;previous='value';continue;}
    if(ch==='`'){const end=readQuoted(i,'`');html+=paint(source.slice(i,end),'tok-template');i=end;if(source[end-1]!=='`')state.template=true;previous='value';continue;}
    const regexMayStart=!previous||/^(=|\(|\[|\{|:|,|;|!|\?|&&|\|\||=>|return|case)$/.test(previous);
    if(ch==='/'&&regexMayStart){let p=i+1,inClass=false;while(p<source.length){if(source[p]==='\\'){p+=2;continue;}if(source[p]==='[')inClass=true;else if(source[p]===']')inClass=false;else if(source[p]==='/'&&!inClass){p++;while(/[a-z]/i.test(source[p]||''))p++;break;}p++;}html+=paint(source.slice(i,p),'tok-regex');i=p;previous='value';continue;}
    const word=source.slice(i).match(/^[\p{L}_$][\p{L}\p{N}_$]*/u)?.[0];
    if(word){
      let cls='tok-plain';
      if(core.has(word))cls='tok-core';else if(keywords.has(word))cls='tok-keyword';else if(word==='true'||word==='false'||word==='null'||word==='undefined'||word==='NaN')cls='tok-literal';else if(builtins.has(word)||members.has(word))cls='tok-builtin';else if(/^\s*\(/.test(source.slice(i+word.length)))cls='tok-function';
      html+=paint(word,cls);i+=word.length;previous=word;continue;
    }
    const number=source.slice(i).match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?n?/ )?.[0]?.trimEnd();
    if(number){html+=paint(number,'tok-number');i+=number.length;previous='value';continue;}
    const operator=source.slice(i).match(/^(?:===|!==|=>|==|!=|<=|>=|\+\+|--|&&|\|\||\?\?|\*\*|\+=|-=|\*=|\/=|\?\.|\?\?|[+*/%<>=!&|?:.,;(){}\[\]-])/ )?.[0]?.trimEnd();
    if(operator){html+=paint(operator,coreOperators.has(operator)?'tok-core':'tok-operator');i+=operator.length;previous=operator;continue;}
    html+=esc(ch);i++;previous=ch;
  }
  return html;
}
function kind(v){return v===null?'null':v===undefined?'undefined':Array.isArray(v)?'array':typeof v;}
function fmt(v){
  if(typeof v==='string')return '"'+v+'"';
  if(v===undefined)return 'undefined';
  if(typeof v==='bigint')return v+'n';
  if(typeof v==='symbol')return v.toString();
  if(typeof v==='function')return 'ƒ()';
  if(typeof v==='object'&&v!==null){try{return JSON.stringify(v);}catch(e){return String(v);}}
  return String(v);
}
function parseAny(raw){
  const s=String(raw).trim();
  if(s==='')return undefined;
  if(s==='null')return null;if(s==='undefined')return undefined;
  if(s==='true')return true;if(s==='false')return false;
  if(s==='NaN')return NaN;if(s==='Infinity')return Infinity;if(s==='-Infinity')return -Infinity;
  if(/^[+-]?\d+n$/.test(s))return BigInt(s.slice(0,-1));
  if(/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s))return Number(s);
  let m=s.match(/^Symbol\((.*)\)$/);if(m)return Symbol(m[1]);
  if(s[0]==='['||s[0]==='{'||s[0]==='"'){
    try{return JSON.parse(s);}catch(e){}
    if(s[0]!=='"'){ // м’який розбір: [a, b] або {a:1} без лапок
      try{
        const fixed=s.replace(/'([^']*)'/g,'"$1"').replace(/("(?:[^"\\]|\\.)*")|([^\s,\[\]{}:"]+)/g,(m,q,w)=>q?q:(/^(-?\d+(\.\d+)?([eE][+-]?\d+)?|true|false|null)$/.test(w)?w:JSON.stringify(w)));
        return JSON.parse(fixed);
      }catch(e){}
    }
  }
  if(s.length>1&&s[0]==="'"&&s[s.length-1]==="'")return s.slice(1,-1);
  return s;
}
function say(el,text,ok){el.textContent=text;el.className='msg'+(ok===true?' ok':ok===false?' err':'');}
const codeDialog=$('#codeDialog');
function showCode(title,source){
  const dependencies=[];
  if(source.includes('$(')&&!/const\s+\$\s*=/.test(source))dependencies.push(`const $ = ${$.toString()};`);
  if(source.includes('$$(')&&!/const\s+\$\$\s*=/.test(source))dependencies.push(`const $$ = ${$$.toString()};`);
  if(/\bparseAny\(/.test(source)&&!source.includes('function parseAny'))dependencies.push(parseAny.toString());
  if(/\bkind\(/.test(source)&&!source.includes('function kind'))dependencies.push(kind.toString());
  if(/\bfmt\(/.test(source)&&!source.includes('function fmt'))dependencies.push(fmt.toString());
  if(/\besc\(/.test(source)&&!source.includes('const esc'))dependencies.push(`const esc = ${esc.toString()};`);
  if(/\bsay\(/.test(source)&&!source.includes('function say'))dependencies.push(say.toString());
  if(dependencies.length)source=dependencies.join('\n\n')+'\n\n'+source;
  source=formatCode(source);
  $('#codeTitle').textContent=title;
  const lexerState={template:false};
  $('#codeSource').innerHTML=source.split('\n').map(line=>`<span class="code-line">${highlightCode(line,lexerState)||' '}</span>`).join('');
  codeDialog.showModal();
}
function onCode(target,make){target.classList.add('code-target');target.title='Правий клік — показати приклад коду';target.addEventListener('contextmenu',e=>{e.preventDefault();const content=make(e);if(content)showCode(content.title,content.source);});}
$('#codeClose').addEventListener('click',()=>codeDialog.close());
codeDialog.addEventListener('click',e=>{if(e.target===codeDialog)codeDialog.close();});

/* ===== page chrome ===== */
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('in');}),{threshold:.06});
$$('.reveal').forEach(el=>io.observe(el));
const bar=$('#bar');
addEventListener('scroll',()=>{const h=document.documentElement;bar.style.width=(scrollY/Math.max(1,h.scrollHeight-innerHeight)*100)+'%';},{passive:true});
const navLinks=$$('nav a');
const so=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)navLinks.forEach(l=>l.classList.toggle('on',l.getAttribute('href')==='#'+e.target.id));}),{rootMargin:'-45% 0px -50% 0px'});
$$('section.topic').forEach(s=>so.observe(s));
if(innerWidth>700)$('#fo').style.display='block';

/* ===== 01 VARIABLES ===== */
(function(){
  const RESERVED=new Set('let const var if else for while do function return class new this null true false undefined typeof delete in of switch case break continue default try catch throw'.split(' '));
  const NAME_RE=/^[\p{L}_$][\p{L}\p{N}_$]*$/u;
  const vars=[{kind:'let',name:'age',value:25},{kind:'const',name:'name',value:'Олена'}];
  const shelf=$('#varShelf'),msg=$('#varMsg');
  function render(flash){
    shelf.innerHTML=vars.length?vars.map((v,i)=>`<div class="vbox${i===flash?' pop':''}" data-i="${i}" data-k="${kind(v.value)}">
      <div class="vtag k-${v.kind}">${v.kind}${v.kind==='const'?' 🔒':''}</div>
      <div class="vname">${esc(v.name)}</div>
      <div class="vval">${esc(fmt(v.value))}</div>
      <div class="vtype">${kind(v.value)}</div>
      <div class="vassign"><input placeholder="нове значення"><button type="button" class="btn sm">=</button></div></div>`).join('')
      :'<div class="empty">Тут порожньо — створи першу змінну</div>';
  }
  function create(){
    const k=$('#varKind').value,name=$('#varName').value.trim(),val=parseAny($('#varVal').value);
    if(!NAME_RE.test(name)||RESERVED.has(name))return say(msg,`SyntaxError: недопустима назва «${name}»`,false);
    const ex=vars.findIndex(v=>v.name===name);
    if(ex>-1){
      if(vars[ex].kind==='var'&&k==='var'){vars[ex].value=val;render(ex);return say(msg,`var дозволяє повторне оголошення — значення «${name}» перезаписано (саме тому var вважають небезпечним).`,true);}
      return say(msg,`SyntaxError: Identifier '${name}' has already been declared`,false);
    }
    vars.push({kind:k,name,value:val});render(vars.length-1);
    say(msg,`✓ Створено ${k} ${name} = ${fmt(val)} (тип: ${kind(val)})`,true);
  }
  function assign(e){
    const button=e.target.closest('button');if(!button)return;
    const box=button.closest('.vbox'),i=+box.dataset.i,v=vars[i],input=$('input',box);
    if(v.kind==='const'){
      box.classList.remove('shake');void box.offsetWidth;box.classList.add('shake');
      return say(msg,`TypeError: Assignment to constant variable. («${v.name}» оголошена через const)`,false);
    }
    v.value=parseAny(input.value);render(i);say(msg,`✓ ${v.name} тепер ${fmt(v.value)} — тип ${kind(v.value)}`,true);
  }
  $('#varBtn').addEventListener('click',create);
  onCode($('#vars .stage'),()=>({title:'Оголошення та присвоєння змінних',source:`const RESERVED=new Set('let const var if else for while do function return class new this null true false undefined typeof delete in of switch case break continue default try catch throw'.split(' '));\nconst NAME_RE=/^[\\p{L}_$][\\p{L}\\p{N}_$]*$/u;\nconst vars=[{kind:'let',name:'age',value:25},{kind:'const',name:'name',value:'Олена'}];\nconst shelf=$('#varShelf'),msg=$('#varMsg');\n\n${sourceOf(render,create,assign)}\n\n$('#varBtn').addEventListener('click',create);\nshelf.addEventListener('click',assign);`}));
  $('#varForm').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();create();}});
  shelf.addEventListener('click',assign);
  render();
})();

/* ===== 02 TYPES ===== */
(function(){
  const T=[
    {n:'Number',ic:'123',k:'number',d:'Цілі й дробові числа, а також Infinity та NaN.',ex:['11','3.14','-7','NaN','Infinity']},
    {n:'String',ic:'“ ”',k:'string',d:'Текст. Завжди в лапках.',ex:['"привіт"','""','"42"']},
    {n:'Boolean',ic:'◐',k:'boolean',d:'Логічний тип: лише так або ні.',ex:['true','false']},
    {n:'null',ic:'∅',k:'null',d:'Свідомо «нічого».',ex:['null']},
    {n:'undefined',ic:'?',k:'undefined',d:'Значення ще не задали.',ex:['undefined']},
    {n:'BigInt',ic:'n',k:'bigint',d:'Дуже великі цілі числа.',ex:['9007199254740993n','10n']},
    {n:'Symbol',ic:'◈',k:'symbol',d:'Унікальний ідентифікатор.',ex:['Symbol(id)']},
    {n:'Object',ic:'{ }',k:'object',d:'Масиви, об’єкти, функції — посилальні типи.',ex:['[1,2,3]','{"a":1}','function']}
  ];
  $('#typeGrid').innerHTML=T.map(t=>`<div class="tcard" data-k="${t.k}"><div class="ic">${t.ic}</div><h4>${t.n}</h4><p>${t.d}</p>${t.ex.map(x=>`<span class="chip" data-v='${x}'>${esc(x)}</span>`).join('')}<div class="mini"></div></div>`).join('');
  const anal=$('#anal'),analyzeInput=$('#anIn');
  function inspectValue(raw){const value=raw.trim()==='function'?function(){}:parseAny(raw);return{value,type:typeof value,kind:kind(value)};}
  function valueLabel(info){return fmt(info.value);}
  function typeLabel(info){return info.type;}
  function isPrimitive(info){return info.value===null||(info.type!=='object'&&info.type!=='function');}
  function isTruthy(info){return Boolean(info.value);}
  function analyze(raw){
    const info=inspectValue(raw),v=info.value,t=typeLabel(info),prim=isPrimitive(info),truthy=isTruthy(info),k=info.kind;
    anal.innerHTML=`
      <div class="big" data-inspect="value" data-k="${k}"><small>Значення</small><strong>${esc(valueLabel(info))}</strong></div>
      <div class="big" data-inspect="type" data-k="${k}"><small>typeof</small><strong>"${t}"</strong>${v===null?'<br><small style="margin-top:6px">⚠ історична помилка мови: null — не об’єкт</small>':''}${Array.isArray(v)?'<br><small style="margin-top:6px">масив теж «object»</small>':''}</div>
      <div data-inspect="category"><small>Категорія</small><strong>${prim?'примітив':'посилальний'}</strong></div>
      <div data-inspect="truthy"><small>У умові (if)</small><strong class="${truthy?'truthy':'falsy'}">${truthy?'true ✓':'false ✗'}</strong></div>`;
    return v;
  }
  $('#typeGrid').addEventListener('click',e=>{
    const c=e.target.closest('.chip');if(!c)return;
    $('#anIn').value=c.dataset.v;const v=analyze(c.dataset.v);
    $$('.mini').forEach(m=>m.textContent='');
    $('.mini',c.closest('.tcard')).textContent='typeof → "'+typeof v+'"';
  });
  function analyzeButton(){analyze(analyzeInput.value);}
  function analyzeOnEnter(e){if(e.key==='Enter')analyze(analyzeInput.value);}
  $('#anBtn').addEventListener('click',analyzeButton);
  analyzeInput.addEventListener('keydown',analyzeOnEnter);
  analyze('11');
  onCode($('#anForm'),e=>e.target.closest('#anBtn')?({title:'Кнопка «Визначити тип»',source:`const analyzeInput=$('#anIn');\n\n${sourceOf(analyzeButton,analyze,inspectValue,valueLabel,typeLabel,isPrimitive,isTruthy)}`}):({title:'Аналіз після натискання Enter',source:`const analyzeInput=$('#anIn');\n\n${sourceOf(analyzeOnEnter,analyze,inspectValue,valueLabel,typeLabel,isPrimitive,isTruthy)}`}));
  onCode(anal,e=>{
    const card=e.target.closest('[data-inspect]');if(!card)return null;
    const views={
      value:{title:'Як визначається значення',functions:[inspectValue,valueLabel]},
      type:{title:'Як визначається typeof',functions:[inspectValue,typeLabel]},
      category:{title:'Як визначається категорія типу',functions:[inspectValue,isPrimitive]},
      truthy:{title:'Як перевіряється значення в if',functions:[inspectValue,isTruthy]}
    };
    const view=views[card.dataset.inspect];return{title:view.title,source:`const analyzeInput=$('#anIn');\n\n${sourceOf(...view.functions)}`};
  });
})();

/* ===== 03 DYNAMIC ===== */
(function(){
  const VALS=[['11',11],['"11"','11'],['3.14',3.14],['true',true],['null',null],['undefined',undefined],['[1,2,3]',[1,2,3]],['{a:1}',{a:1}],['10n',10n]];
  let last='number',cnt=0;const trail=[],history=[];
  const box=$('#dynbox'),val=$('#dynval'),ty=$('#dyntype');
  $('#dynbtns').innerHTML=VALS.map((v,i)=>`<button class="btn sm ghost" data-i="${i}">x = ${esc(v[0])}</button>`).join('');
  function changeValue(e){
    const b=e.target.closest('button');if(!b)return;
    const v=VALS[+b.dataset.i][1],k=kind(v);
    history.push(`x = ${VALS[+b.dataset.i][0]};`);if(history.length>6)history.shift();
    box.dataset.k=k;val.textContent=fmt(v);ty.textContent='typeof → '+typeof v;ty.dataset.k=k;
    val.classList.remove('bump');void val.offsetWidth;val.classList.add('bump');
    if(k!==last)cnt++;last=k;$('#dyncount').textContent=cnt;
    trail.push([fmt(v),k]);if(trail.length>6)trail.shift();
    $('#dyntrail').innerHTML=trail.map(t=>`<span class="pill" data-k="${t[1]}">${esc(t[0])}</span>`).join('<i>→</i>');
  }
  $('#dynbtns').addEventListener('click',changeValue);
  onCode($('#dynamic .dyn'),()=>({title:'Обробник зміни типу змінної x',source:`const VALS=[['11',11],['"11"','11'],['3.14',3.14],['true',true],['null',null],['undefined',undefined],['[1,2,3]',[1,2,3]],['{a:1}',{a:1}],['10n',10n]];\nlet last='number',cnt=0;const trail=[],history=[];\nconst box=$('#dynbox'),val=$('#dynval'),ty=$('#dyntype');\n\n${sourceOf(changeValue)}\n\n$('#dynbtns').addEventListener('click',changeValue);\n\n// Останні значення, вибрані у демо:\n${history.length?history.map(x=>'// '+x).join('\n'):'// Історія поки порожня.'}`}));
  ty.dataset.k='number';ty.textContent='typeof → number';

  const OPS=[['Арифметичні',['+','-','*','/','%','**']],['Порівняння',['==','!=','===','!==','<','>','<=','>=']]];
  $('#cOp').innerHTML=OPS.map(g=>`<optgroup label="${g[0]}">${g[1].map(o=>`<option>${esc(o)}</option>`).join('')}</optgroup>`).join('');
  $('#cOp').value='+';
  const F={'+':(a,b)=>a+b,'-':(a,b)=>a-b,'*':(a,b)=>a*b,'/':(a,b)=>a/b,'%':(a,b)=>a%b,'**':(a,b)=>a**b,
    '==':(a,b)=>a==b,'!=':(a,b)=>a!=b,'===':(a,b)=>a===b,'!==':(a,b)=>a!==b,'<':(a,b)=>a<b,'>':(a,b)=>a>b,'<=':(a,b)=>a<=b,'>=':(a,b)=>a>=b,
    '&&':(a,b)=>a&&b,'||':(a,b)=>a||b,'??':(a,b)=>a??b,'&':(a,b)=>a&b,'|':(a,b)=>a|b,'^':(a,b)=>a^b,'<<':(a,b)=>a<<b,'>>':(a,b)=>a>>b,'>>>':(a,b)=>a>>>b,'in':(a,b)=>a in b};
  function explain(op,l,r){
    if(op==='===')return 'Строге порівняння: типи НЕ приводяться. Різні типи — одразу false.';
    if(op==='!==')return 'Строга нерівність: якщо типи різні — завжди true.';
    if(op==='=='||op==='!=')return typeof l===typeof r?'Типи однакові — порівнюємо значення.':'Нестроге порівняння: JS спершу приводить типи до спільного (null == undefined — true, але null == 0 — false).';
    if(op==='+'){
      const strish=x=>typeof x==='string'||(typeof x==='object'&&x!==null);
      return strish(l)||strish(r)?'Якщо серед операндів є рядок (або масив/об’єкт) — «+» склеює текст.':'Лише числа та їхні родичі: true → 1, false/null → 0, undefined → NaN.';
    }
    if(['-','*','/','%','**'].includes(op))return 'Оператор «'+op+'» завжди перетворює обидва операнди на числа ("5" → 5, "abc" → NaN). Ділення на 0 дає Infinity.';
    if(['<','>','<=','>='].includes(op))return typeof l==='string'&&typeof r==='string'?'Два рядки порівнюються посимвольно, як у словнику: "10" < "9" — true!':'Операнди приводяться до чисел і порівнюються як числа.';
    if(op==='&&')return 'Повертає перший хибний операнд, а якщо хибних немає — останній. Результат не обов’язково boolean!';
    if(op==='||')return 'Повертає перший правдивий операнд, а якщо правдивих немає — останній.';
    if(op==='??')return 'Повертає правий операнд, лише якщо лівий — null або undefined (0 і "" лишаються).';
    if(op==='in')return 'Перевіряє, чи є ключ (або індекс) в об’єкті чи масиві. Праворуч має бути об’єкт.';
    return 'Побітові оператори перетворюють операнди на 32-бітні цілі числа й працюють з їхніми бітами.';
  }
  function calc(){
    const l=parseAny($('#cL').value),r=parseAny($('#cR').value),op=$('#cOp').value,box=$('#cRes');
    const head=`<div style="font-family:var(--mono);color:var(--mute)">${esc(fmt(l))} ${esc(op)} ${esc(fmt(r))} =</div>`;
    try{
      const res=F[op](l,r),k=kind(res);
      box.dataset.k=k;
      box.innerHTML=head+`<div class="rv">${esc(fmt(res))}</div><span class="pill" data-k="${k}">${typeof res}</span><div class="why">${explain(op,l,r)}</div>`;
    }catch(err){
      box.dataset.k='null';
      box.innerHTML=head+`<div class="rv" style="color:var(--red);font-size:1.1rem">${esc(err.name)}</div><div class="why">${esc(err.message)}</div>`;
    }
  }
  $('#cL').addEventListener('input',calc);$('#cR').addEventListener('input',calc);$('#cOp').addEventListener('change',calc);
  const EX=[['"5"','+','3'],['5','+','3'],['"5"','-','3'],['true','+','true'],['null','+','3'],['undefined','+','3'],['"5"','==','5'],['"5"','===','5'],['[]','+','5'],['"abc"','*','3'],['"10"','<','"9"'],['10','<','9'],['10','**','3']];
  $('#cEx').innerHTML='<span class="counter">Цікаві приклади:</span>'+EX.map((x,i)=>`<span class="chip" data-i="${i}">${esc(x[0]+' '+x[1]+' '+x[2])}</span>`).join('');
  $('#cEx').addEventListener('click',e=>{const c=e.target.closest('.chip');if(!c)return;const x=EX[+c.dataset.i];$('#cL').value=x[0];$('#cOp').value=x[1];$('#cR').value=x[2];calc();});
  calc();
})();

/* ===== 04 ARRAYS ===== */
(function(){
  const INIT=()=>[8,15,3,42,100];
  let arr=INIT();const cells=$('#cells');
  function render(newIdx,hit){
    cells.innerHTML=arr.length?arr.map((v,i)=>`<div class="cell${i===newIdx?' pop':''}${i===hit?' hit':''}" data-k="${kind(v)}" title="${esc(fmt(v))}"><span class="v">${esc(typeof v==='string'?v:fmt(v))}</span><span class="ix">${i}</span></div>`).join(''):'<div class="empty">Масив порожній: []</div>';
    $('#arrLen').textContent=arr.length;
  }
  const note=t=>say($('#arrNote'),t,true);
  function run(op){
    const raw=$('#arrIn').value;
    if((op==='push'||op==='unshift')){
      if(raw.trim()==='')return say($('#arrNote'),'Введи значення',false);
      if(arr.length>=12)return say($('#arrNote'),'Максимум 12 елементів у цій демці',false);
    }
    switch(op){
      case 'push':arr.push(parseAny(raw));render(arr.length-1);note(`push додав елемент у кінець. Нова довжина: ${arr.length}`);break;
      case 'unshift':arr.unshift(parseAny(raw));render(0);note(`unshift додав на початок — усі індекси зсунулись на +1`);break;
      case 'pop':{const r=arr.pop();render();note(arr.length+1>0&&r!==undefined?`pop забрав і повернув ${fmt(r)}`:'pop на порожньому масиві повертає undefined');break;}
      case 'shift':{const r=arr.shift();render();note(r!==undefined?`shift забрав перший елемент ${fmt(r)} — решта зсунулась на −1`:'shift на порожньому масиві повертає undefined');break;}
      case 'reverse':arr.reverse();render();note('reverse розвернув масив (змінив його на місці)');break;
      case 'sort':arr.sort();render();note('sort() без аргументів порівнює елементи як РЯДКИ: "100" < "25" < "3"');break;
      case 'sortnum':arr.sort((a,b)=>typeof a==='number'&&typeof b==='number'?a-b:String(a).localeCompare(String(b)));render();note('sort із функцією-порівнювачем: числа впорядковано за значенням');break;
      case 'clear':arr=[];render();note('Довжина тепер 0');break;
      case 'reset':arr=INIT();render();note('Скинуто до початкового масиву');break;
    }
  }
  function handleArrayClick(e){const b=e.target.closest('[data-op]');if(!b)return;e.preventDefault();run(b.dataset.op);}
  $('#arrays .stage').addEventListener('click',handleArrayClick);
  $('#arrIn').addEventListener('keydown',e=>{if(e.key==='Enter')run('push');});
  function get(){
    const i=parseInt($('#arrIdx').value,10),v=arr[i];
    render(undefined,i>=0&&i<arr.length?i:-1);
    $('#arrGot').innerHTML=`масив[${isNaN(i)?'?':i}] → <b style="color:var(--js)">${esc(fmt(v))}</b>${i>=arr.length||i<0?' (такого індексу немає)':''}`;
  }
  $('#arrGet').addEventListener('click',get);
  onCode($('#arrays .stage'),e=>{const op=e.target.closest('[data-op]')?.dataset.op;return{title:op?`Масив: ${op}`:'Отримання елемента масиву',source:`const INIT=()=>[8,15,3,42,100];\nlet arr=INIT();\nconst cells=$('#cells');\n\n${sourceOf(render,note,op?run:get,handleArrayClick)}\n\n$('#arrGet').addEventListener('click',get);`};});
  cells.addEventListener('click',e=>{const c=e.target.closest('.cell');if(!c)return;const i=[...cells.children].indexOf(c);$('#arrIdx').value=i;get();});
  render();
})();

/* ===== 05 OBJECTS ===== */
(function(){
  function createUser(){return{name:'Олена',age:25,isStudent:true,skills:['HTML','CSS','JS'],sayHi:function(){return 'Привіт, я '+this.name+'!';}};}
  const user=createUser();
  let selKey=null;const rows=$('#objRows'),acc=$('#objAccess'),msg=$('#objMsg');
  const IDENT=/^[\p{L}_$][\p{L}\p{N}_$]*$/u;
  const path=k=>IDENT.test(k)?'user.'+k:'user["'+k+'"]';
  function render(){
    const es=Object.entries(user);
    $('#objCount').textContent=es.length+' власт.';
    rows.innerHTML=es.map(([k,v])=>`<div class="orow${k===selKey?' sel':''}" data-key="${esc(k)}" data-k="${kind(v)}">
      <span class="k">${esc(k)}</span><span class="v">${typeof v==='function'?'ƒ метод':esc(fmt(v))}</span>
      <span class="pill">${typeof v==='function'?'function':kind(v)}</span><button class="x" title="видалити" data-del="${esc(k)}">×</button></div>`).join('')||'<div class="empty" style="margin:12px">Об’єкт порожній: {}</div>';
    $('#objKeys').innerHTML=Object.keys(user).map(k=>`<span class="chip">${esc(k)}</span>`).join('')||'<span class="counter">[]</span>';
  }
  function showAccess(){
    if(selKey===null)return;
    const v=user[selKey];
    if(typeof v==='function'){
      acc.innerHTML=`${esc(path(selKey))} → <b>ƒ</b> <button class="btn sm" id="callBtn">викликати ${esc(selKey)}()</button>`;
      $('#callBtn').onclick=callSelected;
    }else{
      acc.innerHTML=`${esc(path(selKey))} → <b>${esc(fmt(v))}</b>`;
    }
  }
  function handleObjectClick(e){
    const d=e.target.closest('[data-del]');
    if(d){const k=d.dataset.del;delete user[k];if(selKey===k){selKey=null;acc.textContent='Властивість видалено 🗑';}render();say(msg,`delete прибрав «${k}». Тепер user.${k} → undefined`,true);return;}
    const r=e.target.closest('.orow');if(!r)return;
    selKey=r.dataset.key;render();showAccess();say(msg,'',null);
  }
  function callSelected(){try{say(msg,'Результат: '+user[selKey](),true);}catch(e){say(msg,e.name+': '+e.message,false);}}
  rows.addEventListener('click',handleObjectClick);
  function addProp(){
    const k=$('#objKey').value.trim();
    if(!k)return say(msg,'Введи назву ключа',false);
    const had=k in user;user[k]=parseAny($('#objVal').value);selKey=k;render();showAccess();
    say(msg,had?`Властивість «${k}» оновлено`:`Додано нову властивість «${k}»`,true);
  }
  $('#objBtn').addEventListener('click',addProp);
  onCode($('#objects .stage'),()=>({title:'Об’єкт: створення та зміна властивостей',source:`const IDENT=/^[\\p{L}_$][\\p{L}\\p{N}_$]*$/u;\nconst path=k=>IDENT.test(k)?'user.'+k:'user["'+k+'"]';\nconst user=createUser();\nlet selKey=null;\nconst rows=$('#objRows'),acc=$('#objAccess'),msg=$('#objMsg');\n\n${sourceOf(createUser,render,handleObjectClick,addProp,showAccess,callSelected)}`}));
  $('#objForm').addEventListener('keydown',e=>{if(e.key==='Enter')addProp();});
  // method wired via showAccess; if sayHi removed show tip
  render();
})();

/* ===== 06 CONDITIONS ===== */
(function(){
  const range=$('#tRange');
  function branches(){return [
    {c:'t < 0',test:t=>t<0,em:'🥶',tt:'Мороз',dd:'Пуховик, шапка і гарячий чай',bg:'linear-gradient(160deg,#1e3a8a,#0ea5e9)'},
    {c:'t < 15',test:t=>t<15,em:'🧥',tt:'Прохолодно',dd:'Одягни куртку',bg:'linear-gradient(160deg,#0f766e,#38bdf8)'},
    {c:'t < 27',test:t=>t<27,em:'😎',tt:'Комфортно',dd:'Вистачить футболки',bg:'linear-gradient(160deg,#16a34a,#facc15)'},
    {c:'else',test:()=>true,em:'🥵',tt:'Спека',dd:'Вода, тінь і кондиціонер',bg:'linear-gradient(160deg,#ea580c,#dc2626)'}
  ];}
  function render(){
    const BR=branches();
    const t=+range.value;$('#tVal').textContent=t;
    let found=-1;
    $('#chain').innerHTML=BR.map((b,i)=>{
      let cls,note;
      if(found>-1){cls='skip';note='пропущено';}
      else if(b.test(t)){found=i;cls='pass';note='✓ виконується';}
      else{cls='fail';note='✗ хибно';}
      const head=i===0?'if':b.c==='else'?'':'else if';
      return `<div class="node ${cls}"><span>${head} ${b.c==='else'?'else':'('+b.c.replace('t',t)+')'}</span><small>${note}</small></div>`;
    }).join('');
    const w=BR[found];
    $('#scene').style.background=w.bg;
    $('#scene').innerHTML=`<div class="em">${w.em}</div><div class="tt">${w.tt}</div><div class="dd">${w.dd}</div>`;
  }
  range.addEventListener('input',render);render();

  const DAYS=['пн','вт','ср','чт','пт','сб','нд'];let day='ср';
  const days=$('#days'),swRows=$('#swRows');
  const GROUPS=[{cs:['пн','вт','ср','чт','пт'],r:'Робочий день 💼'},{cs:['сб','нд'],r:'Вихідний 🎉'}];
  days.innerHTML=DAYS.map(d=>`<div class="day${d===day?' on':''}" data-d="${d}">${d}</div>`).join('')+'<div class="day" data-d="default">default</div>';
  function renderSw(){
    $$('.day').forEach(x=>x.classList.toggle('on',x.dataset.d===day));
    swRows.innerHTML=GROUPS.map(g=>{
      const idx=g.cs.indexOf(day),hit=idx>-1;
      return `<div class="swrow${hit?' hit':''}">${g.cs.map((c,i)=>`<span class="cs${hit&&i>=idx?' lit':''}">case ${c}</span>`).join('')}<span class="arrow">→ ${g.r}${hit?' ✓ break':''}</span></div>`;
    }).join('')+`<div class="swrow${day==='default'?' hit':''}"><span class="cs${day==='default'?' lit':''}">default</span><span class="arrow" style="color:${day==='default'?'var(--green)':'var(--mute)'}">${day==='default'?'→ Невідомий день ✓':'не потрібен — день знайдено'}</span></div>`;
  }
  function selectDay(e){const d=e.target.closest('.day');if(!d)return;day=d.dataset.d;renderSw();}
  days.addEventListener('click',selectDay);
  onCode($('#cond .stage:nth-of-type(2)'),()=>({title:'Обробник switch і гілка default',source:`const DAYS=['пн','вт','ср','чт','пт','сб','нд'];\nlet day='ср';\nconst GROUPS=[{cs:['пн','вт','ср','чт','пт'],r:'Робочий день 💼'},{cs:['сб','нд'],r:'Вихідний 🎉'}];\nconst days=$('#days'),swRows=$('#swRows');\n\n${sourceOf(renderSw,selectDay)}`}));
  onCode($('#cond .stage:first-of-type'),()=>({title:'Обробник умов if / else if',source:`const range=$('#tRange');\n\n${sourceOf(branches,render)}`}));
  renderSw();

  let A=true,B=false;
  function lg(){
    $('#tA').classList.toggle('on',A);$('#tB').classList.toggle('on',B);
    const items=[['A && B',A&&B],['A || B',A||B],['!A',!A],['A ? "так" : "ні"',A?'так':'ні']];
    $('#logic').innerHTML=items.map(([l,v])=>`<div><small>${l}</small><strong style="color:${v===true?'var(--green)':v===false?'var(--red)':'var(--cyan)'}">${typeof v==='string'?'"'+v+'"':v}</strong></div>`).join('');
  }
  $('#tA').onclick=()=>{A=!A;lg();};$('#tB').onclick=()=>{B=!B;lg();};lg();
  onCode($('#logic'),()=>({title:'Оновлення виводу логічних операторів',source:`let A=true,B=false;\nconst logic=$('#logic');\n\n${sourceOf(lg)}`}));
})();

/* ===== 07 LOOPS ===== */
(function(){
  const DESC={
    for:'for: ми знаємо кількість повторів. Лічильник i росте на 1, доки i менший за ліміт; кожен крок додаємо i до суми.',
    while:'while: повторюємо, доки умова істинна. Тут число щоразу ділиться навпіл, поки більше за 1.',
    of:'for…of: обходимо всі елементи колекції по черзі — без жодних лічильників.'
  };
  let mode='for',n=5,frames=[],cells=[],k=-1,timer=null,eachValues=['яблуко','банан','вишня'];
  function build(){
    frames=[];cells=[];
    if(mode==='for'){
      let sum=0;cells=Array.from({length:n},(_,i)=>i);
      for(let i=0;i<n;i++){sum+=i;frames.push({a:i,v:[['i',i],['сума',sum]],c:`${i} < ${n}  → істина`,t:true,l:`Ітерація ${i+1}: i = ${i}, сума = ${sum}`});}
      frames.push({a:-1,v:[['i',n],['сума',sum]],c:`${n} < ${n}  → хибно`,t:false,l:`Цикл завершено. Підсумок: ${sum}`,done:true});
    }else if(mode==='while'){
      cells=[64,32,16,8,4,2,1];
      cells.forEach((x,i)=>{
        if(x>1)frames.push({a:i,v:[['x',x],['кроків',i]],c:`${x} > 1  → істина`,t:true,l:`x = ${x} → ділимо навпіл → ${x/2}`});
        else frames.push({a:-1,v:[['x',x],['кроків',i]],c:`${x} > 1  → хибно`,t:false,l:`Цикл завершено за ${i} кроків`,done:true});
      });
    }else if(mode==='of'){
      cells=['🍎','🍌','🍒','🍇','🍓'];
      cells.forEach((f,i)=>frames.push({a:i,v:[['fruit',f],['у кошику',i+1]],c:`є наступний елемент → ${f}`,t:true,l:`кладемо в кошик: ${f}`}));
      frames.push({a:-1,v:[['fruit','—'],['у кошику',cells.length]],c:'елементи закінчились',t:false,l:`Кошик повний: ${cells.join(' ')}`,done:true});
    }else{
      cells=eachValues.slice();
      cells.forEach((value,i)=>frames.push({a:i,v:[['element',value],['index',i]],c:`${i} < ${cells.length}  → callback`,t:true,l:`forEach: element = ${value}, index = ${i}`}));
      frames.push({a:-1,v:[['element','—'],['index','—']],c:'масив обійдено',t:false,l:`forEach завершено: ${cells.length} елемент(и)`,done:true});
    }
    k=-1;draw();
  }
  function draw(){
    const f=frames[k],cur=k>=0?f:null;
    $('#track').innerHTML=cells.map((c,i)=>{
      let cls='';
      if(cur){if(cur.done||i<cur.a)cls='done';else if(i===cur.a)cls='active';}
      return `<div class="lc ${cls}">${c}</div>`;
    }).join('');
    $('#lVars').innerHTML=cur?cur.v.map(([a,b])=>`<div class="vv"><span>${a}</span><span>${esc(b)}</span></div>`).join(''):'<span class="counter">Натисни «Крок»</span>';
    const cd=$('#lCond');cd.textContent=cur?cur.c:'—';cd.className='cond'+(cur?(cur.t?' t':' f'):'');
    $('#lLog').innerHTML=frames.slice(0,k+1).map(x=>`<div>${esc(x.l)}</div>`).join('');
    const lg=$('#lLog');lg.scrollTop=lg.scrollHeight;
    $('#lStep').disabled=k>=frames.length-1;
    if(k>=frames.length-1)stop();
  }
  function step(){if(k<frames.length-1){k++;draw();}}
  function stop(){clearInterval(timer);timer=null;$('#lPlay').textContent='▶ Автоплей';}
  function play(){
    if(timer){stop();return;}
    if(k>=frames.length-1){k=-1;draw();}
    $('#lPlay').textContent='⏸ Пауза';
    timer=setInterval(step,+$('#lSpeed').value);step();
  }
  function setMode(m){
    stop();mode=m;$$('#loopTabs .tab').forEach(t=>t.classList.toggle('on',t.dataset.m===m));
    $('#loopDesc').textContent=m==='each'?'forEach викликає callback для кожного елемента масиву; callback отримує значення та індекс.':DESC[m];$('#loopNRow').style.display=m==='for'?'flex':'none';$('#eachRow').style.display=m==='each'?'flex':'none';build();
  }
  $('#loopTabs').addEventListener('click',e=>{const t=e.target.closest('.tab');if(t)setMode(t.dataset.m);});
  $('#lStep').onclick=()=>{stop();step();};
  $('#lPlay').onclick=play;
  function reset(){stop();k=-1;draw();}
  $('#lReset').onclick=reset;
  $('#lSpeed').onchange=()=>{if(timer){stop();play();}};
  $('#loopRange').addEventListener('input',e=>{stop();n=+e.target.value;$('#loopN').textContent=n;build();});
  $('#eachApply').addEventListener('click',()=>{try{const parsed=parseAny($('#eachInput').value);if(!Array.isArray(parsed))throw new Error();eachValues=parsed;build();}catch{$('#lLog').innerHTML='<div style="color:var(--red)">Введи коректний масив, наприклад [\'a\', 2, true]</div>';}});
  onCode($('#loops .stage'),e=>{
    const target=e.target.closest('#lPlay,#lStep,#lReset,#loopTabs,#track,#lLog');
    const functions=target?.id==='lPlay'?[play,step,draw]:target?.id==='lStep'?[step,draw]:target?.id==='lReset'?[reset,draw]:[build,draw];
    return{title:`Цикл ${mode==='each'?'forEach':mode==='of'?'for…of':mode} — логіка та вивід`,source:`const DESC={\n  for:'for: ми знаємо кількість повторів. Лічильник i росте на 1, доки i менший за ліміт; кожен крок додаємо i до суми.',\n  while:'while: повторюємо, доки умова істинна. Тут число щоразу ділиться навпіл, поки більше за 1.',\n  of:'for…of: обходимо всі елементи колекції по черзі — без жодних лічильників.'\n};\nlet mode='for',n=5,frames=[],cells=[],k=-1,timer=null,eachValues=['яблуко','банан','вишня'];\n\n${sourceOf(...functions)}`};
  });
  setMode('for');
})();

/* ===== 08 DOM ===== */
(function(){
  const sb=$('#sandbox'),treeEl=$('#tree'),msg=$('#domMsg');
  sb.innerHTML='<h3>Привіт, DOM!</h3><p>Це звичайний абзац.</p><ul><li>Перший пункт</li><li>Другий пункт</li></ul><button>Кнопка</button>';
  let sel=null,nodes=[];
  function walk(el,root){
    const idx=nodes.push(el)-1;
    const cls=[...el.classList].map(c=>'.'+c).join('');
    const tag=root?'div#sandbox':el.tagName.toLowerCase()+cls;
    let kids='';
    el.childNodes.forEach(n=>{
      if(n.nodeType===1)kids+=walk(n,false);
      else if(n.nodeType===3&&n.textContent.trim())kids+=`<li class="tn-text">"${esc(n.textContent.trim())}"</li>`;
    });
    return `<li><span class="tn${el===sel?' sel':''}" data-i="${idx}">&lt;${esc(tag)}&gt;</span>${kids?'<ul>'+kids+'</ul>':''}</li>`;
  }
  function refresh(){
    nodes=[];treeEl.innerHTML='<ul>'+walk(sb,true)+'</ul>';
    $$('[data-sel]',sb).forEach(x=>x.removeAttribute('data-sel'));sb.removeAttribute('data-sel');
    if(sel&&sel!==sb)sel.setAttribute('data-sel','');
  }
  const name=el=>el===sb?'контейнер #sandbox':'<'+el.tagName.toLowerCase()+'>';
  function select(el){sel=el;refresh();say(msg,sel?'Обрано '+name(sel):'',true);}
  sb.addEventListener('click',e=>{e.preventDefault();select(e.target===sb?sb:e.target);});
  treeEl.addEventListener('click',e=>{const t=e.target.closest('.tn');if(t)select(nodes[+t.dataset.i]);});
  const need=()=>{if(!sel){say(msg,'Спершу обери елемент (клікни на сторінці або в дереві)',false);return false;}return true;};
  function addElement(){
    const parent=sel||sb,tag=$('#domTag').value,el=document.createElement(tag);
    el.textContent={p:'Новий абзац',span:'span-текст',li:'Новий пункт',h3:'Новий заголовок',button:'Кнопка',div:'Новий блок'}[tag];
    parent.appendChild(el);sel=el;refresh();say(msg,`createElement("${tag}") + appendChild → додано в ${name(parent)}`,true);
  }
  function toggleClass(){if(!need())return;if(sel===sb)return say(msg,'Обери вкладений елемент',false);const on=sel.classList.toggle('hl');refresh();say(msg,on?'Клас .hl додано':'Клас .hl прибрано',true);}
  function changeStyle(){
    if(!need())return;if(sel===sb)return say(msg,'Обери вкладений елемент',false);
    const h=Math.floor(Math.random()*360);sel.style.backgroundColor=`hsl(${h} 80% 80%)`;sel.style.color=`hsl(${h} 60% 25%)`;sel.style.borderRadius='8px';sel.style.padding='4px 8px';
    refresh();say(msg,'Стиль змінено напряму через style',true);
  }
  function deleteElement(){if(!need())return;if(sel===sb)return say(msg,'Контейнер видаляти не будемо 🙂',false);const n=name(sel);sel.remove();sel=null;refresh();say(msg,`${n} видалено з документа`,true);}
  function changeText(){if(!need())return;sel.textContent=$('#domText').value;refresh();say(msg,'Текст змінено. Увага: якщо в елемента були діти — вони зникли разом зі старим вмістом',true);}
  $('#dAdd').onclick=addElement;$('#dClass').onclick=toggleClass;$('#dStyle').onclick=changeStyle;$('#dDel').onclick=deleteElement;$('#dText').onclick=changeText;
  function find(){
    $$('[data-match]',sb).forEach(x=>x.removeAttribute('data-match'));
    const s=$('#domSel').value.trim();if(!s)return;
    try{const f=sb.querySelectorAll(s);f.forEach(x=>x.setAttribute('data-match',''));say(msg,f.length?`Знайдено елементів: ${f.length} (підсвічено зеленим)`:'Нічого не знайдено — повернуло порожній список',!!f.length);}
    catch(e){say(msg,'SyntaxError: некоректний селектор',false);}
  }
  $('#dFind').onclick=find;
  $('#domSel').addEventListener('keydown',e=>{if(e.key==='Enter')find();});
  function selectPreset(e){const chip=e.target.closest('.chip[data-s]');if(!chip)return;$('#domSel').value=chip.dataset.s;find();}
  $$('.chip[data-s]').forEach(c=>c.addEventListener('click',selectPreset));
  onCode($('#dom .stage'),e=>{
    const control=e.target.closest('button, [data-s]');
    const id=control?.id,func={dAdd:addElement,dClass:toggleClass,dStyle:changeStyle,dDel:deleteElement,dText:changeText,dFind:find}[id];
    const title=({dAdd:'Створення елемента',dClass:'Перемикання класу',dStyle:'Зміна стилю',dDel:'Видалення елемента',dText:'Зміна тексту',dFind:'Пошук за CSS-селектором'})[id]||'Вибір елемента DOM';
    const code=func||control?.dataset.s?sourceOf(...(func?[func]:[selectPreset,find])):sourceOf(walk,refresh,select);
    return{title,source:`const sb=$('#sandbox'),treeEl=$('#tree'),msg=$('#domMsg');\nlet sel=null,nodes=[];\nconst name=el=>el===sb?'контейнер #sandbox':'<'+el.tagName.toLowerCase()+'>';\nconst need=()=>{if(!sel){say(msg,'Спершу обери елемент',false);return false;}return true;};\n\n${sourceOf(walk,refresh,select,func||find,need)}`};
  });
  refresh();
})();

/* ===== 09 EVENTS ===== */
(function(){
  /* playground */
  const pad=$('#pad'),logEl=$('#evLog');
  const TYPES=['click','dblclick','contextmenu','mouseenter','mouseleave','mousemove','keydown','wheel'];
  const counts={},on={click:1,dblclick:1,mouseenter:1,mouseleave:1};
  let lines=[];
  $('#evChecks').innerHTML=TYPES.map(t=>`<label class="${on[t]?'on':''}"><input type="checkbox" data-t="${t}" ${on[t]?'checked':''}>${t}<em id="cnt-${t}">0</em></label>`).join('');
  function ripple(e){
    const r=pad.getBoundingClientRect(),s=document.createElement('span');s.className='ripple';
    s.style.left=(e.clientX-r.left)+'px';s.style.top=(e.clientY-r.top)+'px';pad.appendChild(s);setTimeout(()=>s.remove(),700);
  }
  function paintLog(){
    logEl.innerHTML=lines.length?lines.map(l=>`<div><span class="tp">${l.t}</span><span>${esc(l.i)}</span><span class="tm">${l.time}</span></div>`).join(''):'<span class="counter">Подій ще не було…</span>';
  }
  function handler(t){
    return function(e){
      counts[t]=(counts[t]||0)+1;$('#cnt-'+t).textContent=counts[t];
      let info='';
      if(t==='keydown'){info='key: '+(e.key===' '?'Space':e.key);if(e.key===' '||e.key.startsWith('Arrow'))e.preventDefault();}
      else if(t==='wheel'){e.preventDefault();info='deltaY: '+Math.round(e.deltaY);}
      else{const r=pad.getBoundingClientRect();info=`x: ${Math.round(e.clientX-r.left)}, y: ${Math.round(e.clientY-r.top)}`;if(t==='click'||t==='dblclick'||t==='contextmenu')ripple(e);}
      if(t==='contextmenu'){e.preventDefault();info+=' (меню скасовано)';}
      const time=new Date().toLocaleTimeString('uk-UA');
      if((t==='mousemove'||t==='wheel')&&lines[0]&&lines[0].t===t){lines[0]={t,i:info,time};}
      else{lines.unshift({t,i:info,time});if(lines.length>7)lines.pop();}
      paintLog();
    };
  }
  const hs={};TYPES.forEach(t=>hs[t]=handler(t));
  const listen=(t,add)=>{if(t==='wheel'){if(add)pad.addEventListener(t,hs[t],{passive:false});else pad.removeEventListener(t,hs[t]);}else if(add)pad.addEventListener(t,hs[t]);else pad.removeEventListener(t,hs[t]);};
  Object.keys(on).forEach(t=>listen(t,true));
  function toggleSubscription(e){
    const t=e.target.dataset.t;if(!t)return;
    e.target.parentElement.classList.toggle('on',e.target.checked);
    listen(t,e.target.checked);
  }
  $('#evChecks').addEventListener('change',toggleSubscription);
  onCode($('#evChecks'),e=>{const t=e.target.closest('label')?.querySelector('[data-t]')?.dataset.t;if(!t)return null;return{title:`Реальний обробник події ${t}`,source:`const pad = $('#pad');\nconst logEl = $('#evLog');\n\n${sourceOf(handler(t),toggleSubscription,listen,paintLog)}`} ;});
  onCode(pad,()=>({title:'Обробники інтерактивного поля',source:`const pad = $('#pad');\nconst logEl = $('#evLog');\n\n${sourceOf(handler('click'),handler('wheel'),listen,paintLog)}`}));
  paintLog();

  /* inputs */
  let ci=0,cc=0;const nameIn=$('#nameIn');
  function onNameInput(){ $('#cInput').textContent=++ci;$('#echo').textContent=nameIn.value?'Ти вводиш: '+nameIn.value:''; }
  function onNameChange(){ $('#cChange').textContent=++cc; }
  nameIn.addEventListener('input',onNameInput);
  nameIn.addEventListener('change',onNameChange);
  function greet(){
    $('#echo').textContent=nameIn.value.trim()?`👋 Привіт, ${nameIn.value.trim()}!`:'Спершу введи ім’я';
  }
  $('#greetBtn').addEventListener('click',greet);
  function greetOnEnter(e){if(e.key==='Enter')greet();}
  nameIn.addEventListener('keydown',greetOnEnter);
  function resizeCircle(e){
    const v=+e.target.value,c=$('#circle');c.style.width=c.style.height=v+'px';c.textContent=v;c.style.filter=`hue-rotate(${(v-30)*2}deg)`;
  }
  $('#circR').addEventListener('input',resizeCircle);
  onCode($('#demoForm'),()=>({title:'Реальні обробники поля та форми',source:`const nameIn = $('#nameIn');\n\n${sourceOf(onNameInput,onNameChange,greet,greetOnEnter)}\n\nnameIn.addEventListener('input', onNameInput);\nnameIn.addEventListener('change', onNameChange);\nnameIn.addEventListener('keydown', greetOnEnter);`}));
  onCode($('#circR'),()=>({title:'Реальний обробник повзунка',source:`const circle = $('#circle');\n\n${sourceOf(resizeCircle)}`}));

  /* bubbling */
  const boxes=$$('.bx'),orderEl=$('#order');
  let capture=false,stopMid=false,order=[],pending=false,timers=[];
  function bh(e){
    order.push(this.dataset.n);
    if(stopMid&&this.dataset.n===$('#stopTarget').value)e.stopPropagation();
    if(!pending){pending=true;setTimeout(flush,0);}
  }
  function attach(){boxes.forEach(b=>{b.removeEventListener('click',bh,true);b.removeEventListener('click',bh,false);b.addEventListener('click',bh,capture);});}
  function flush(){
    pending=false;const seq=order;order=[];
    timers.forEach(clearTimeout);timers=[];boxes.forEach(b=>b.classList.remove('fire'));
    orderEl.innerHTML='';
    seq.forEach((n,i)=>{
      timers.push(setTimeout(()=>{
        const b=boxes.find(x=>x.dataset.n===n);b.classList.add('fire');
        orderEl.insertAdjacentHTML('beforeend',`${i?'<i style="color:var(--mute)">→</i>':''}<span class="pill" style="--c:var(--${n==='outer'?'violet':n==='middle'?'cyan':'pink'})">${i+1}. ${n}</span>`);
        setTimeout(()=>b.classList.remove('fire'),420);
      },i*480));
    });
    if(seq.length&&stopMid&&!seq.includes('outer')||(seq.length&&stopMid&&capture&&!seq.includes('inner'))){
      timers.push(setTimeout(()=>orderEl.insertAdjacentHTML('beforeend','<span class="counter">⛔ stopPropagation: далі подія не пішла</span>'),seq.length*480));
    }
  }
  function changePhase(e){
    const r=e.currentTarget;
    capture=r.value==='capture'&&r.checked?true:$('input[name=phase]:checked').value==='capture';
    $('#phBubble').classList.toggle('on',!capture);$('#phCapture').classList.toggle('on',capture);attach();
  }
  $$('input[name=phase]').forEach(r=>r.addEventListener('change',changePhase));
  function togglePropagationStop(e){stopMid=e.target.checked;$('#stopTog').classList.toggle('on',stopMid);}
  $('#stopMid').addEventListener('change',togglePropagationStop);
  onCode($('#events .stage:nth-of-type(3) .row'),()=>({title:'Реальні обробники спливання та занурення',source:`const boxes = $$('.bx');\nconst orderEl = $('#order');\n\n${sourceOf(bh,attach,changePhase,togglePropagationStop,flush)}`}));
  onCode($('#events .bx.outer'),()=>({title:'Як обробляється й показується порядок подій',source:`const boxes = $$('.bx');\nconst orderEl = $('#order');\n\n${sourceOf(bh,attach,flush)}`}));
  attach();

  /* delegation */
  const list=document.getElementById('deleList');let ni=0;
  function addItem(t){const li=document.createElement('li');li.innerHTML=`<span>${esc(t)}</span><small class="counter">клікни</small>`;list.appendChild(li);$('#deleN').textContent=list.children.length;}
  ['Купити хліб','Вивчити JavaScript','Погуляти'].forEach(addItem);
  function handleListClick(e){
    const li=e.target.closest('li');if(!li)return;
    li.classList.toggle('done');
    say($('#deleMsg'),`Спрацював єдиний обробник на <ul>. e.target → <li> «${li.firstChild.textContent}»`,true);
  }
  list.addEventListener('click',handleListClick);
  function addTodo(){addItem('Нове завдання №'+(++ni));say($('#deleMsg'),'Новий елемент одразу працює — додатковий обробник не потрібен',true);}
  $('#deleAdd').onclick=addTodo;
  onCode($('#deleList'),()=>({title:'Делегування подій списку',source:`const list=document.getElementById('deleList');let ni=0;\n\n${sourceOf(addItem,handleListClick,addTodo)}\n\n['Купити хліб','Вивчити JavaScript','Погуляти'].forEach(addItem);\nlist.addEventListener('click',handleListClick);\n$('#deleAdd').onclick=addTodo;`}));
  onCode($('#deleAdd'),()=>({title:'Додавання рядка у список',source:`const list=document.getElementById('deleList');let ni=0;\n\n${sourceOf(addItem,addTodo)}\n\n$('#deleAdd').onclick=addTodo;`}));
})();
})();
