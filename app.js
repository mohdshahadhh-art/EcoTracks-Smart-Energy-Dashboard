// app.js - EcoPower 2.0 interactive dashboard
document.addEventListener("DOMContentLoaded", () => {
  console.log("EcoPower 2.0 loaded");

  // Elements
  const liveCtx = document.getElementById("liveChart").getContext("2d");
  const barCtx = document.getElementById("barChart").getContext("2d");
  const doughCtx = document.getElementById("doughnutChart").getContext("2d");
  const suggestionsContainer = document.getElementById("suggestions");
  const totalEl = document.getElementById("totalConsumption");
  const savedEl = document.getElementById("energySaved");
  const scoreEl = document.getElementById("efficiencyScore");
  const themeToggle = document.getElementById("themeToggle");

  // Device state & contributions (kW approximate)
  const devices = {
    AC: { on: true, value: 1.2 },
    Fridge: { on: true, value: 0.8 },
    Lights: { on: true, value: 0.6 },
    Washer: { on: false, value: 0.7 },
    Electronics: { on: true, value: 0.4 }
  };

  // Update theme (default saved or light)
  function initTheme() {
    const saved = localStorage.getItem("theme") || "dark";
    document.documentElement.setAttribute("data-theme", saved);
    themeToggle.textContent = saved === "dark" ? "☀️" : "🌙";
  }
  initTheme();

  themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", current);
    localStorage.setItem("theme", current);
    themeToggle.textContent = current === "dark" ? "☀️" : "🌙";
    updateChartColors();
  });

  // Chart defaults
  Chart.defaults.font.family = "Inter, sans-serif";
  Chart.defaults.plugins.legend.labels.usePointStyle = true;

  // Live Chart
  const liveChart = new Chart(liveCtx, {
    type: "line",
    data: { labels: [], datasets: [{ label: "Power (kW)", data: [], borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.12)", fill: true, tension: 0.36, pointRadius: 0, borderWidth: 2 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      scales: {
        y: { min: 0, max: 6, title: { display: true, text: "kW" }, ticks: { stepSize: 1 } },
        x: { title: { display: true, text: "Time" } }
      },
      plugins: { legend: { display: true } }
    }
  });

  // Bar Chart (daily pattern)
  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`);
  const barValues = hours.map((h, i) => {
    if (i >= 6 && i <= 9) return +(3.5 + Math.random() * 1.5).toFixed(1);
    if (i >= 17 && i <= 21) return +(4 + Math.random() * 1.6).toFixed(1);
    if (i >= 10 && i <= 16) return +(2 + Math.random() * 1.5).toFixed(1);
    return +(0.8 + Math.random() * 0.9).toFixed(1);
  });

  const barChart = new Chart(barCtx, {
    type: "bar",
    data: { labels: hours, datasets: [{ label: "Avg (kW)", data: barValues, backgroundColor: "rgba(16,185,129,0.85)", borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });

  // Doughnut Chart (device distribution)
  function doughDataFromDevices() {
    return [
      devices.AC.on ? devices.AC.value : 0,
      devices.Lights.on ? devices.Lights.value : 0,
      devices.Fridge.on ? devices.Fridge.value : 0,
      devices.Washer.on ? devices.Washer.value : 0,
      devices.Electronics.on ? devices.Electronics.value : 0
    ];
  }

  const doughnutChart = new Chart(doughCtx, {
    type: "doughnut",
    data: {
      labels: ["AC", "Lighting", "Fridge", "Washer", "Electronics"],
      datasets: [{ data: doughDataFromDevices(), backgroundColor: ["#10b981","#3b82f6","#f59e0b","#ef4444","#8b5cf6"], borderColor: "#0f172a", borderWidth: 1 }]
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: "60%", plugins: { legend: { position: "bottom" } } }
  });

  // Smooth random baseline plus device contribution
  let baseline = 2.0; // base kW
  let lastValue = baseline;
  let drift = 0;
  function computeDeviceSum() {
    return Object.values(devices).reduce((s, d) => s + (d.on ? d.value : 0), 0);
  }

  function smoothRandom() {
    drift += (Math.random() - 0.5) * 0.06;
    lastValue += drift * 0.8;
    const deviceSum = computeDeviceSum();
    // baseline behavior plus devices
    let value = Math.max(0.3, Math.min(5.5, lastValue * 0.6 + deviceSum));
    // gentle damping
    drift *= 0.92;
    lastValue = lastValue * 0.98 + baseline * 0.02;
    return +value.toFixed(2);
  }

  // Suggestion system: keep three items persistent, fade slowly (2s), shuffle positions each update
  function ensureSuggestionBoxes() {
    if (!suggestionsContainer) return;
    if (suggestionsContainer.children.length >= 3) return;
    suggestionsContainer.innerHTML = "";
    for (let i = 0; i < 3; i++) {
      const div = document.createElement("div");
      div.className = "suggestion-item";
      div.innerHTML = `<div class="suggestion-icon">💡</div><div class="suggestion-text">Preparing suggestion...</div>`;
      suggestionsContainer.appendChild(div);
    }
  }
  ensureSuggestionBoxes();

  function updateSuggestions(currentPower) {
    ensureSuggestionBoxes();
    let items;
    if (currentPower >= 3.2) {
      items = [
        { icon: "🔥", text: "High usage! Turn off unused devices." },
        { icon: "💡", text: "Switch to LED bulbs to cut lighting consumption." },
        { icon: "❄️", text: "Adjust thermostat by 2°C to save energy." }
      ];
    } else if (currentPower >= 2.1) {
      items = [
        { icon: "📱", text: "Unplug chargers when not in use." },
        { icon: "🖥️", text: "Enable power-saving mode on electronics." },
        { icon: "🌡️", text: "Use fans instead of AC when possible." }
      ];
    } else {
      items = [
        { icon: "✅", text: "Excellent efficiency — keep going!" },
        { icon: "🌱", text: "Consider solar panels for long-term savings." },
        { icon: "📊", text: "You're below average usage today." }
      ];
    }

    // Shuffle the items order each update for subtle variety
    const shuffled = items.sort(() => Math.random() - 0.5);

    // Update each DOM box with slow fade (2s)
    const boxes = suggestionsContainer.querySelectorAll(".suggestion-item");
    boxes.forEach((box, i) => {
      const iconEl = box.querySelector(".suggestion-icon");
      const textEl = box.querySelector(".suggestion-text");
      // begin fade out
      box.style.transition = "opacity 0.8s ease, transform 0.8s ease";
      box.style.opacity = 0;
      box.style.transform = "translateY(12px) scale(0.98)";
      // after fade out, change content and fade in slowly (2s)
      setTimeout(() => {
        iconEl.textContent = shuffled[i].icon;
        textEl.textContent = shuffled[i].text;
        // slightly reorder boxes in DOM to "shuffle positions"
        if (Math.random() > 0.5) {
          suggestionsContainer.appendChild(box);
        } else {
          suggestionsContainer.prepend(box);
        }
        box.style.transition = "opacity 2s ease, transform 2s ease, box-shadow 1s ease";
        box.style.opacity = 1;
        box.style.transform = "translateY(0) scale(1)";
        box.style.boxShadow = "0 8px 30px rgba(16,185,129,0.06)";
        setTimeout(() => (box.style.boxShadow = "none"), 1800);
      }, 700 + i * 120);
    });
  }

  // Insight cards: compute kWh and derived metrics
  function computeInsights() {
    const data = liveChart.data.datasets[0].data;
    if (!data || data.length === 0) {
      totalEl.textContent = "0.0";
      savedEl.textContent = "0";
      scoreEl.textContent = "0";
      return;
    }
    // assume each point is sampled every second -> convert kW-seconds to kWh: sum(kW) * dt(1s) / 3600
    const sampleIntervalSeconds = LIVE_INTERVAL_SEC; // from below
    const sumKW = data.reduce((s, v) => s + Number(v || 0), 0);
    const kwh = (sumKW * sampleIntervalSeconds) / 3600;
    totalEl.textContent = kwh.toFixed(2);

    const avgKW = sumKW / data.length;
    const energySaved = Math.max(0, Math.min(100, Math.round((4.5 - avgKW) / 4.5 * 100)));
    savedEl.textContent = energySaved;
    const score = Math.round((energySaved / 100) * 10);
    scoreEl.textContent = score;
  }

  // Device toggles wiring
  document.querySelectorAll(".devices input[type=checkbox]").forEach(cb => {
    const deviceKey = cb.dataset.device;
    // initial value synchronized
    if (devices[deviceKey]) cb.checked = !!devices[deviceKey].on;
    cb.addEventListener("change", (e) => {
      devices[deviceKey].on = e.target.checked;
      // update doughnut and immediate chart effect
      doughnutChart.data.datasets[0].data = doughDataFromDevices();
      doughnutChart.update("none");
    });
  });

  function doughDataFromDevices() {
    return [
      devices.AC.on ? devices.AC.value : 0,
      devices.Lights.on ? devices.Lights.value : 0,
      devices.Fridge.on ? devices.Fridge.value : 0,
      devices.Washer.on ? devices.Washer.value : 0,
      devices.Electronics.on ? devices.Electronics.value : 0
    ];
  }

  // Update chart colors according theme
  function updateChartColors() {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const textColor = isDark ? "#f1f5f9" : "#1f2937";
    const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

    [liveChart, barChart, doughnutChart].forEach(c => {
      if (!c) return;
      if (c.options.scales) {
        Object.values(c.options.scales).forEach(scale => {
          if (scale.ticks) scale.ticks.color = textColor;
          if (scale.grid) scale.grid.color = gridColor;
        });
      }
      if (c.options.plugins?.legend?.labels) {
        c.options.plugins.legend.labels.color = textColor;
      }
      c.update("none");
    });
  }

  // Live update loop
  const LIVE_INTERVAL_SEC = 1; // 1 second sampling interval
  function startLive() {
    let tick = 0;
    setInterval(() => {
      const val = smoothRandom();
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      liveChart.data.labels.push(now);
      liveChart.data.datasets[0].data.push(val);
      if (liveChart.data.labels.length > 20) {
        liveChart.data.labels.shift();
        liveChart.data.datasets[0].data.shift();
      }
      liveChart.update("none");

      // update suggestions every 4 seconds for smoother UX
      if (tick % 4 === 0) updateSuggestions(val);

      // recompute insights every 5 seconds
      if (tick % 5 === 0) computeInsights();

      tick++;
    }, LIVE_INTERVAL_SEC * 1000);
  }

  // Initialize: ensure suggestions, set charts colors and start loop
  ensureSuggestionBoxes();
  updateSuggestions(2.5);
  updateChartColors();
  startLive();

  // Enhanced Profile functionality
  const profileIcon = document.getElementById("profileIcon");
  const profileModal = document.getElementById("profileModal");
  const closeModal = document.getElementById("closeModal");
  const saveProfile = document.getElementById("saveProfile");
  const cancelProfile = document.getElementById("cancelProfile");
  const userName = document.getElementById("userName");
  const userPicture = document.getElementById("userPicture");
  const userPictureUrl = document.getElementById("userPictureUrl");
  const uploadBtn = document.getElementById("uploadBtn");
  const fileInfo = document.getElementById("fileInfo");
  const energyGoal = document.getElementById("energyGoal");
  const previewAvatar = document.getElementById("previewAvatar");
  const previewName = document.getElementById("previewName");
  const previewGoal = document.getElementById("previewGoal");

  // Profile state management
  let currentProfileData = {
    name: "",
    picture: "",
    goal: ""
  };

  // Load saved profile data
  function loadProfile() {
    const savedProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
    currentProfileData = { ...savedProfile };
    
    userName.value = savedProfile.name || "";
    userPictureUrl.value = savedProfile.picture || "";
    energyGoal.value = savedProfile.goal || "";
    
    // Reset file input
    userPicture.value = "";
    fileInfo.textContent = "No file selected";
    
    // Load saved image if available
    if (savedProfile.picture) {
      updatePreviewWithImage(savedProfile.picture);
    } else {
      updatePreview();
    }
  }

  // Update preview in real-time with smooth animation
  function updatePreview() {
    const name = userName.value || "Your Name";
    const picture = userPictureUrl.value;
    const goal = energyGoal.value || "0";
    
    previewName.textContent = name;
    previewGoal.textContent = `Goal: ${goal} kWh`;
    
    updateAvatarWithAnimation(previewAvatar, picture);
  }

  // Update preview with image data and smooth animation
  function updatePreviewWithImage(imageData) {
    const name = userName.value || "Your Name";
    const goal = energyGoal.value || "0";
    
    previewName.textContent = name;
    previewGoal.textContent = `Goal: ${goal} kWh`;
    
    updateAvatarWithAnimation(previewAvatar, imageData);
  }

  // Smooth avatar update with fade animation
  function updateAvatarWithAnimation(avatarElement, imageData) {
    if (imageData) {
      // Fade out current image
      avatarElement.style.opacity = "0";
      avatarElement.style.transition = "opacity 0.3s ease";
      
      setTimeout(() => {
        avatarElement.style.backgroundImage = `url(${imageData})`;
        avatarElement.textContent = "";
        avatarElement.style.backgroundSize = "cover";
        avatarElement.style.backgroundPosition = "center";
        avatarElement.style.backgroundRepeat = "no-repeat";
        
        // Fade in new image
        avatarElement.style.opacity = "1";
      }, 150);
    } else {
      // Fade out and show default avatar
      avatarElement.style.opacity = "0";
      avatarElement.style.transition = "opacity 0.3s ease";
      
      setTimeout(() => {
        avatarElement.style.backgroundImage = "";
        avatarElement.textContent = "👤";
        avatarElement.style.opacity = "1";
      }, 150);
    }
  }

  // Save profile data with enhanced functionality
  function saveProfileData() {
    const profileData = {
      name: userName.value.trim(),
      picture: userPictureUrl.value.trim(),
      goal: energyGoal.value.trim()
    };
    
    // Update current profile data
    currentProfileData = { ...profileData };
    
    // Save to localStorage
    localStorage.setItem("userProfile", JSON.stringify(profileData));
    
    // Update profile icon with smooth animation
    updateProfileIcon(profileData.picture);
    
    // Show success feedback
    showSaveFeedback();
    
    // Close modal after a short delay
    setTimeout(() => {
      closeModalFunc();
    }, 500);
  }

  // Update profile icon with smooth animation
  function updateProfileIcon(imageData) {
    const profileAvatar = document.querySelector(".profile-avatar");
    
    if (imageData) {
      // Fade out current avatar
      profileAvatar.style.opacity = "0";
      profileAvatar.style.transition = "opacity 0.3s ease";
      
      setTimeout(() => {
        profileAvatar.style.backgroundImage = `url(${imageData})`;
        profileAvatar.textContent = "";
        profileAvatar.style.backgroundSize = "cover";
        profileAvatar.style.backgroundPosition = "center";
        profileAvatar.style.backgroundRepeat = "no-repeat";
        
        // Fade in new avatar
        profileAvatar.style.opacity = "1";
      }, 150);
    } else {
      // Fade out and show default avatar
      profileAvatar.style.opacity = "0";
      profileAvatar.style.transition = "opacity 0.3s ease";
      
      setTimeout(() => {
        profileAvatar.style.backgroundImage = "";
        profileAvatar.textContent = "👤";
        profileAvatar.style.opacity = "1";
      }, 150);
    }
  }

  // Show save feedback
  function showSaveFeedback() {
    const saveBtn = document.getElementById("saveProfile");
    const originalText = saveBtn.textContent;
    
    saveBtn.textContent = "✓ Saved!";
    saveBtn.style.background = "#10b981";
    saveBtn.style.transform = "scale(1.05)";
    
    setTimeout(() => {
      saveBtn.textContent = originalText;
      saveBtn.style.background = "";
      saveBtn.style.transform = "";
    }, 1000);
  }

  // Close modal function
  function closeModalFunc() {
    profileModal.classList.remove("show");
  }

  // Event listeners
  profileIcon.addEventListener("click", () => {
    loadProfile();
    profileModal.classList.add("show");
  });

  closeModal.addEventListener("click", closeModalFunc);
  cancelProfile.addEventListener("click", closeModalFunc);
  saveProfile.addEventListener("click", saveProfileData);

  // Close modal when clicking outside
  profileModal.addEventListener("click", (e) => {
    if (e.target === profileModal) {
      closeModalFunc();
    }
  });

  // Enhanced file upload handling with error handling
  uploadBtn.addEventListener("click", () => {
    userPicture.click();
  });

  userPicture.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showError("Please select a valid image file (JPG, PNG, GIF, etc.)");
        userPicture.value = "";
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showError("Image file is too large. Please select an image smaller than 5MB.");
        userPicture.value = "";
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target.result;
        userPictureUrl.value = imageData;
        updatePreviewWithImage(imageData);
        fileInfo.textContent = `Selected: ${file.name}`;
        fileInfo.style.color = "var(--accent)";
        
        // Clear any previous errors
        clearError();
      };
      
      reader.onerror = () => {
        showError("Failed to read the image file. Please try again.");
        userPicture.value = "";
      };
      
      reader.readAsDataURL(file);
    }
  });

  // URL validation for image URLs
  userPictureUrl.addEventListener("input", (e) => {
    const url = e.target.value.trim();
    if (url) {
      // Validate URL format
      try {
        new URL(url);
        // Test if it's an image URL
        if (!url.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i)) {
          showError("Please enter a valid image URL (JPG, PNG, GIF, WebP, SVG)");
          return;
        }
        clearError();
        updatePreview();
      } catch {
        showError("Please enter a valid URL");
        return;
      }
    } else {
      clearError();
      updatePreview();
    }
  });

  // Real-time preview updates
  userName.addEventListener("input", updatePreview);
  energyGoal.addEventListener("input", updatePreview);

  // Error handling functions
  function showError(message) {
    // Remove existing error message
    clearError();
    
    // Create error element
    const errorDiv = document.createElement("div");
    errorDiv.className = "profile-error";
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      color: #ef4444;
      font-size: 12px;
      margin-top: 8px;
      padding: 8px 12px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 6px;
      animation: slideIn 0.3s ease;
    `;
    
    // Insert after the picture input container
    const pictureContainer = document.querySelector(".picture-input-container");
    pictureContainer.parentNode.insertBefore(errorDiv, pictureContainer.nextSibling);
  }

  function clearError() {
    const existingError = document.querySelector(".profile-error");
    if (existingError) {
      existingError.remove();
    }
  }

  // Load profile on page load
  loadProfile();

  // Load profile icon on page load with smooth animation
  function loadProfileIcon() {
    const savedProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
    const profileAvatar = document.querySelector(".profile-avatar");
    
    if (savedProfile.picture) {
      profileAvatar.style.backgroundImage = `url(${savedProfile.picture})`;
      profileAvatar.textContent = "";
      profileAvatar.style.backgroundSize = "cover";
      profileAvatar.style.backgroundPosition = "center";
      profileAvatar.style.backgroundRepeat = "no-repeat";
    } else {
      profileAvatar.style.backgroundImage = "";
      profileAvatar.textContent = "👤";
    }
    
    // Ensure avatar is visible
    profileAvatar.style.opacity = "1";
  }

  // Load profile icon when page loads
  loadProfileIcon();

  // Enhanced Navigation System
  const navButtons = document.querySelectorAll('.nav-btn');
  const sections = {
    'Dashboard': document.getElementById('dashboard'),
    'Analytics': document.getElementById('analytics'),
    'Tips': document.getElementById('tips'),
    'Settings': document.getElementById('settings')
  };

  let isScrolling = false;
  let scrollTimeout;

  // Function to set active navigation button
  function setActiveNavButton(activeButtonText) {
    navButtons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.textContent.trim() === activeButtonText) {
        btn.classList.add('active');
      }
    });
  }

  // Enhanced scroll detection with throttling
  function updateActiveNav() {
    if (isScrolling) return; // Prevent conflicts during programmatic scrolling
    
    const scrollPosition = window.scrollY + 200; // Increased offset for better detection
    let activeSection = 'Dashboard';
    let maxVisibleArea = 0;
    
    for (const [sectionName, section] of Object.entries(sections)) {
      if (section) {
        const sectionTop = section.offsetTop;
        const sectionBottom = sectionTop + section.offsetHeight;
        const viewportTop = scrollPosition;
        const viewportBottom = scrollPosition + window.innerHeight;
        
        // Calculate visible area of section
        const visibleTop = Math.max(sectionTop, viewportTop);
        const visibleBottom = Math.min(sectionBottom, viewportBottom);
        const visibleArea = Math.max(0, visibleBottom - visibleTop);
        
        // Section is considered active if it has the most visible area
        if (visibleArea > maxVisibleArea) {
          maxVisibleArea = visibleArea;
          activeSection = sectionName;
        }
      }
    }
    
    setActiveNavButton(activeSection);
  }

  // Smooth scroll to section with enhanced behavior
  function scrollToSection(sectionName) {
    const section = sections[sectionName];
    if (section) {
      isScrolling = true;
      setActiveNavButton(sectionName); // Immediately highlight clicked button
      
      section.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
      
      // Reset scrolling flag after animation completes
      setTimeout(() => {
        isScrolling = false;
      }, 1000);
    }
  }

  // Enhanced click event listeners with immediate feedback
  navButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionName = btn.textContent.trim();
      
      // Add click animation
      btn.style.transform = 'scale(0.95)';
      setTimeout(() => {
        btn.style.transform = '';
      }, 150);
      
      scrollToSection(sectionName);
    });
  });

  // Throttled scroll event listener
  function handleScroll() {
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    
    scrollTimeout = setTimeout(() => {
      updateActiveNav();
    }, 10); // Throttle to 10ms for smooth performance
  }

  window.addEventListener('scroll', handleScroll, { passive: true });

  // Initialize active navigation on page load
  updateActiveNav();

  // Create additional charts for Analytics section
  function createAnalyticsCharts() {
    // Weekly Chart
    const weeklyCtx = document.getElementById('weeklyChart');
    if (weeklyCtx) {
      const weeklyChart = new Chart(weeklyCtx, {
        type: 'line',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            label: 'Weekly Usage (kWh)',
            data: [45, 52, 38, 61, 55, 42, 48],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.1)',
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } }
        }
      });
    }

    // Monthly Chart
    const monthlyCtx = document.getElementById('monthlyChart');
    if (monthlyCtx) {
      const monthlyChart = new Chart(monthlyCtx, {
        type: 'bar',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            label: 'Monthly Usage (kWh)',
            data: [1200, 1350, 1100, 1450, 1300, 1250],
            backgroundColor: 'rgba(16,185,129,0.8)',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } }
        }
      });
    }
  }

  // Initialize analytics charts
  createAnalyticsCharts();

  // expose for console debugging
  window.__ecopower = { devices, liveChart, barChart, doughnutChart, updateSuggestions, computeInsights };
});
