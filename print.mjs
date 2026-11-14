const html=sessionStorage.getItem('jahiz-print-document');
if(html){document.open();document.write(html);document.close();document.getElementById('printReport').addEventListener('click',()=>window.print());document.getElementById('returnReport').addEventListener('click',()=>history.back());}
else{document.body.textContent='افتح الفاتورة أو التقرير من لوحة الإدارة أولاً.';}
