const sectionsEl = document.getElementById("sections");
const apiBar = document.getElementById("api-bar");
const backBtn = document.getElementById("back-btn");
const sectionTitle = document.getElementById("section-title");
const apiList = document.getElementById("api-list");

// تحميل الأقسام من السيرفر
async function loadSections() {
  try {
    const res = await fetch("/api/list");
    const data = await res.json();

    sectionsEl.innerHTML = ""; // تفريغ الرسالة الأولية

    const uniqueSections = [...new Set(data.map(d => d.section))];

    uniqueSections.forEach(section => {
      const card = document.createElement("div");
      card.className = "card";
      card.textContent = section;
      card.addEventListener("click", () => showAPI(section, data));
      sectionsEl.appendChild(card);
    });

  } catch(err) {
    sectionsEl.innerHTML = "<p style='color:red'>❌ فشل تحميل الأقسام</p>";
  }
}

// عرض الـ APIs لقسم معين
function showAPI(section, data) {
  sectionsEl.classList.add("hidden");
  apiBar.classList.remove("hidden");
  sectionTitle.textContent = section;
  apiList.innerHTML = "";

  const apis = data.filter(d => d.section === section);

  apis.forEach(api => {
    const div = document.createElement("div");
    div.className = "api-item";
    div.innerHTML = `<strong>${api.file}</strong> ➜ <code>${api.path}</code>`;
    apiList.appendChild(div);
  });
}

// زر العودة
backBtn.addEventListener("click", () => {
  apiBar.classList.add("hidden");
  sectionsEl.classList.remove("hidden");
});

// استدعاء أولي
loadSections();
