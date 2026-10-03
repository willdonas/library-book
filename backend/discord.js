const styles={
BOOK_CREATED:['📚 Buku Dibuat',0x35A7FF],BOOK_UPDATED:['✏️ Buku Diedit',0xF5B942],BOOK_DELETED:['🗑️ Buku Dihapus',0xEF5350],
USER_REGISTERED:['🆕 User Register',0x46C27A],USER_LOGIN:['🔐 User Login',0x7C9CFF],BOOK_COMMENTED:['💬 Comment Baru',0xB07CFF],
BOOK_VOTED:['👍 Vote Buku',0x38BDF8],BOOK_RATED:['⭐ Rating Buku',0xFFB84D],BOOK_DOWNLOADED:['⬇️ Buku Download',0x5DD39E]
};
function clip(v){v=String(v??'');return v.length>900?v.slice(0,897)+'...':v;}
async function sendDiscordEvent(event,data={}){
 const url=process.env.DISCORD_WEBHOOK_URL;if(!url)return;
 const s=styles[event]||[`Bookly Event: ${event}`,0x94A3B8];
 const fields=Object.entries(data).filter(([,v])=>v!==undefined&&v!==null&&v!=='').slice(0,20).map(([k,v])=>({name:k.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()),value:clip(v),inline:true}));
 try{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'Bookly Logger',embeds:[{title:s[0],description:`Event: \`${event}\``,color:s[1],fields,timestamp:new Date().toISOString(),footer:{text:'Bookly Local Library'}}]})});if(!r.ok)console.error('Discord webhook failed:',r.status);}catch(e){console.error('Discord webhook error:',e.message);}
}
module.exports={sendDiscordEvent};
