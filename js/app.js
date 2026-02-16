// js/app.js

import { auth, db } from "./firebase.js";
import { registerUser, loginUser } from "./auth.js";

import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";


document.addEventListener("DOMContentLoaded", () => {

  /* ===============================
     AUTH BUTTONS
  =============================== */
  document.getElementById("registerBtn")?.addEventListener("click", registerUser);
  document.getElementById("loginBtn")?.addEventListener("click", loginUser);

  const lockScreen = document.getElementById("lockScreen");
  const app = document.getElementById("app");

  /* ===============================
     TASK DOM
  =============================== */
  const titleInput = document.getElementById("taskTitle");
  const descInput = document.getElementById("taskDesc");
  const dueInput = document.getElementById("taskDue");
  const taskTypeSelect = document.getElementById("taskType");

  const addTaskBtn = document.getElementById("addTaskBtn");
  const taskList = document.getElementById("taskList");

  const searchInput = document.getElementById("searchTask");
  const filterSelect = document.getElementById("filterTask");
  const typeFilter = document.getElementById("typeFilter");
  const sortSelect = document.getElementById("sortTask");

  const totalCount = document.getElementById("totalCount");
  const doneCount = document.getElementById("doneCount");
  const todoCount = document.getElementById("todoCount");
  const overdueCount = document.getElementById("overdueCount");

  /* ===============================
     IDEA DOM
  =============================== */
  const ideaInput = document.getElementById("ideaInput");
  const ideaDescInput = document.getElementById("ideaDesc");
  const ideaPriority = document.getElementById("ideaPriority");
  const ideaTypeSelect = document.getElementById("ideaType");
  const ideaTypeFilter = document.getElementById("ideaTypeFilter");
  const addIdeaBtn = document.getElementById("addIdeaBtn");
  const ideaList = document.getElementById("ideaList");
  const ideaCount = document.getElementById("ideaCount");

  let allTasks = [];
  let allIdeas = [];

  /* ===============================
     ACCORDION
  =============================== */
  document.querySelectorAll(".section-header").forEach(header => {
    header.addEventListener("click", () => {

      const parent = header.closest(".section-accordion");

      document.querySelectorAll(".section-accordion").forEach(section => {
        if (section !== parent) {
          section.classList.remove("active");
        }
      });

      parent.classList.toggle("active");
    });
  });

  /* ===============================
     AUTH STATE
  =============================== */
  onAuthStateChanged(auth, (user) => {

    if (!user) {
      lockScreen.classList.remove("hidden");
      app.classList.add("hidden");
      return;
    }

    lockScreen.classList.add("hidden");
    app.classList.remove("hidden");

    /* ===============================
       LOAD TASKS
    =============================== */
    const tasksRef = collection(db, "users", user.uid, "tasks");
    const tasksQuery = query(tasksRef, orderBy("createdAt", "desc"));

    onSnapshot(tasksQuery, (snapshot) => {

      allTasks = [];

      snapshot.forEach(docSnap => {
        allTasks.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });

      renderTasks();
      updateStats();
    });

    /* ===============================
       LOAD IDEAS
    =============================== */
    const ideasRef = collection(db, "users", user.uid, "ideas");
    const ideasQuery = query(ideasRef, orderBy("createdAt", "desc"));

    onSnapshot(ideasQuery, (snapshot) => {

      allIdeas = [];

      snapshot.forEach(docSnap => {
        allIdeas.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });

      renderIdeas();
    });
  });

  /* ===============================
     ADD TASK
  =============================== */
  addTaskBtn?.addEventListener("click", async () => {

    const user = auth.currentUser;
    if (!user) return;

    const title = titleInput.value.trim();
    if (!title) return alert("اكتب عنوان المهمة");

    await addDoc(collection(db, "users", user.uid, "tasks"), {
      title,
      desc: descInput.value || "",
      due: dueInput.value ? new Date(dueInput.value).toISOString() : null,
      done: false,
      type: taskTypeSelect.value,
      createdAt: serverTimestamp()
    });

    titleInput.value = "";
    descInput.value = "";
    dueInput.value = "";
  });

  /* ===============================
     ADD IDEA
  =============================== */
  addIdeaBtn?.addEventListener("click", async () => {

    const user = auth.currentUser;
    if (!user) return;

    const title = ideaInput.value.trim();
    if (!title) return alert("اكتب عنوان الفكرة");

    await addDoc(collection(db, "users", user.uid, "ideas"), {
      title,
      desc: ideaDescInput.value || "",
      priority: ideaPriority.value,
      type: ideaTypeSelect.value,
      createdAt: serverTimestamp()
    });

    ideaInput.value = "";
    ideaDescInput.value = "";
  });

  /* ===============================
     FILTER EVENTS
  =============================== */
  searchInput?.addEventListener("input", renderTasks);
  filterSelect?.addEventListener("change", renderTasks);
  sortSelect?.addEventListener("change", renderTasks);
  typeFilter?.addEventListener("change", renderTasks);
  ideaTypeFilter?.addEventListener("change", renderIdeas);

  /* ===============================
     HELPERS
  =============================== */
  function isOverdue(task) {
    if (!task.due || task.done) return false;
    return new Date(task.due) < new Date();
  }

  function updateStats() {
    const done = allTasks.filter(t => t.done).length;
    const overdue = allTasks.filter(t => isOverdue(t)).length;
    const todo = allTasks.length - done - overdue;

    totalCount.textContent = allTasks.length;
    doneCount.textContent = done;
    todoCount.textContent = todo;
    overdueCount.textContent = overdue;
  }

  /* ===============================
     RENDER TASKS
  =============================== */
  function renderTasks() {

    let tasks = [...allTasks];

    const search = searchInput.value.toLowerCase();
    if (search) {
      tasks = tasks.filter(t =>
        t.title.toLowerCase().includes(search)
      );
    }

    const filter = filterSelect.value;
    if (filter === "done") tasks = tasks.filter(t => t.done);
    if (filter === "todo") tasks = tasks.filter(t => !t.done && !isOverdue(t));
    if (filter === "overdue") tasks = tasks.filter(t => isOverdue(t));

    const typeValue = typeFilter.value;
    if (typeValue !== "all") {
      tasks = tasks.filter(t => t.type === typeValue);
    }

    const sort = sortSelect.value;
    if (sort === "dueAsc")
      tasks.sort((a,b)=>new Date(a.due||0)-new Date(b.due||0));
    if (sort === "dueDesc")
      tasks.sort((a,b)=>new Date(b.due||0)-new Date(a.due||0));

    taskList.innerHTML = "";

    tasks.forEach(task => {

      const li = document.createElement("li");

      li.innerHTML = `
        <div class="task-card">
          <div class="task-header">
            <h3>
              ${task.title}
              <span class="type-badge ${task.type}">
                ${task.type === "work" ? "عمل" : "شخصي"}
              </span>
            </h3>
          </div>
          <div class="task-body">
            <p>${task.desc || "بدون تفاصيل"}</p>
          </div>
        </div>
      `;

      taskList.appendChild(li);
    });
  }

  /* ===============================
     RENDER IDEAS
  =============================== */
  function renderIdeas() {

    let ideas = [...allIdeas];

    const filterValue = ideaTypeFilter?.value || "all";
    if (filterValue !== "all") {
      ideas = ideas.filter(i => i.type === filterValue);
    }

    ideaList.innerHTML = "";
    ideaCount.textContent = ideas.length;

    ideas.forEach(idea => {

      const li = document.createElement("li");

      li.innerHTML = `
        <div class="task-card">
          <div class="task-header">
            <h3>
              ${idea.title}
              <span class="type-badge ${idea.type}">
                ${idea.type === "work" ? "عمل" : "شخصي"}
              </span>
            </h3>
          </div>
          <div class="task-body">
            <p>${idea.desc || "بدون تفاصيل"}</p>
          </div>
        </div>
      `;

      ideaList.appendChild(li);
    });
  }

});
