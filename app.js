const zone = 'America/New_York';
const weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const schedule = [['09:00','16:00','23:00'],['06:00','13:00','20:00'],['10:30','17:30','+00:30'],['07:30','14:30','21:30'],['11:00','18:00','+01:00'],['08:00','15:00','22:00'],['12:30','19:30','+02:30']];
const eastern = new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
const display = new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'long',hour:'numeric',minute:'2-digit'});
function wallTime(date) {
  const fields = Object.fromEntries(eastern.formatToParts(date).map(({type,value})=>[type,Number(value)]));
  return Date.UTC(fields.year,fields.month-1,fields.day,fields.hour,fields.minute,fields.second);
}
function toInstant(wall) {
  const first = wall + (wall-wallTime(new Date(wall)));
  return first + (wall-wallTime(new Date(first)));
}
const dayMs = 86400000;
const months = [Date.UTC(2026,10,1),Date.UTC(2026,11,1),Date.UTC(2027,0,1),Date.UTC(2027,1,1)];
const dailyTimes = schedule.map((times,day)=>[
  ...schedule[(day+6)%7].filter(time=>time.startsWith('+')).map(time=>time.slice(1)),
  ...times.filter(time=>!time.startsWith('+'))
]);
function timesOn(day) {
  return dailyTimes[new Date(day).getUTCDay()].map(time=>{
    const [hour,minute] = time.split(':').map(Number);
    return day+(hour*60+minute)*60000;
  });
}
const allTimes = [];
for(let day=months[0];day<months[3];day+=dayMs) allTimes.push(...timesOn(day));
const timedEvents = allTimes.map(wall=>({wall,instant:toInstant(wall)}));
function render() {
  const now = Date.now();
  const next = timedEvents.find(event=>event.instant>now);
  const timer = document.querySelector('#timer');
  const label = document.querySelector('#next');
  if(!next) {
    timer.textContent = 'Complete';
    label.textContent = 'Your November–January journal is still available below.';
    return;
  }
  const seconds = Math.ceil((next.instant-now)/1000);
  timer.textContent = [Math.floor(seconds/3600),Math.floor(seconds/60)%60,seconds%60].map(value=>String(value).padStart(2,'0')).join(':');
  label.textContent = display.format(next.instant)+' ET';
}
const monthPicker = document.querySelector('#month');
const calendar = document.querySelector('#calendar');
const entries = document.querySelector('#entries');
const status = document.querySelector('#save-status');
const dateLabel = new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'long',month:'long',day:'numeric'});
const timeLabel = new Intl.DateTimeFormat('en-US',{timeZone:'UTC',hour:'numeric',minute:'2-digit'});
function showDay(day) {
  document.querySelector('#date').textContent = dateLabel.format(day);
  entries.replaceChildren();
  status.textContent = '';
  for(const wall of timesOn(day)) {
    const detail = document.createElement('details');
    detail.className = 'entry';
    const summary = document.createElement('summary');
    summary.textContent = timeLabel.format(wall)+' ET';
    detail.append(summary);
    for(const [field,title] of [['notice','What I noticed'],['action','Action I took'],['outcome','How it unfolded']]) {
      const key = 'power-times:'+wall+':'+field;
      const label = document.createElement('label');
      label.textContent = title;
      const input = document.createElement('textarea');
      try { input.value = localStorage.getItem(key) ?? ''; }
      catch { status.textContent = 'Journal storage is unavailable in this browser.'; }
      input.addEventListener('input',()=>{
        try {
          localStorage.setItem(key,input.value);
          status.textContent = 'Saved on this device.';
        } catch {
          status.textContent = 'This entry could not be saved.';
        }
      });
      label.append(input);
      detail.append(label);
    }
    entries.append(detail);
  }
}
function showMonth(selected) {
  const month = Number(monthPicker.value);
  calendar.replaceChildren();
  weekdays.forEach(day=>{
    const label = document.createElement('small');
    label.textContent = day.slice(0,2);
    calendar.append(label);
  });
  for(let blank=0;blank<new Date(months[month]).getUTCDay();blank++) calendar.append(document.createElement('span'));
  for(let day=months[month];day<months[month+1];day+=dayMs) {
    const button = document.createElement('button');
    button.textContent = new Date(day).getUTCDate();
    button.setAttribute('aria-label',dateLabel.format(day));
    button.setAttribute('aria-pressed',String(day===selected));
    button.onclick=()=>{
      calendar.querySelector('[aria-pressed="true"]').setAttribute('aria-pressed','false');
      button.setAttribute('aria-pressed','true');
      showDay(day);
    };
    calendar.append(button);
  }
  showDay(selected);
}
const today = Math.floor(wallTime(new Date())/dayMs)*dayMs;
const selected = Math.min(Math.max(today,months[0]),months[3]-dayMs);
monthPicker.value = String(months.findIndex((start,index)=>start<=selected&&selected<months[index+1]));
monthPicker.onchange=()=>showMonth(months[Number(monthPicker.value)]);
showMonth(selected);
render();
setInterval(render,1000);
const calendarUrl = document.querySelector('#calendar-url');
const copyStatus = document.querySelector('#copy-status');
calendarUrl.addEventListener('focus',()=>calendarUrl.select());
document.querySelector('#copy-calendar').addEventListener('click',async()=>{
  try {
    await navigator.clipboard.writeText(calendarUrl.value);
    copyStatus.textContent = 'Link copied.';
  } catch {
    calendarUrl.focus();
    calendarUrl.select();
    copyStatus.textContent = 'Press and hold the selected URL, then tap Copy.';
  }
});
