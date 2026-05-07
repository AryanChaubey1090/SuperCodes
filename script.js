const resumeInput = document.querySelector("#resumeText");
const jobInput = document.querySelector("#jobText");
const analyzeButton = document.querySelector("#analyzeButton");
const sampleButton = document.querySelector("#loadSampleButton");
const resumeCount = document.querySelector("#resumeCount");
const jobCount = document.querySelector("#jobCount");

const sampleResume = `Product Data Analyst with 5 years of experience improving SaaS onboarding, activation, and retention. Built SQL dashboards in Snowflake and Tableau for product, marketing, and customer success leaders.

Experience
Senior Analyst, BrightCart
- Partnered with product managers to define activation metrics and reduce time to value by 18%.
- Built cohort analysis, funnel reporting, and A/B test readouts using SQL, Python, and Tableau.
- Created executive dashboards tracking churn, expansion, NPS, and feature adoption.
- Presented weekly insights and recommended roadmap priorities based on customer behavior.

Analyst, Northstar Apps
- Automated recurring reports and saved 12 hours per week across operations teams.
- Cleaned event data and documented tracking plans with engineering.

Education
B.S. in Statistics

Skills
SQL, Python, Tableau, Snowflake, Excel, A/B testing, cohort analysis, funnel analysis, stakeholder communication, dashboard design, product analytics`;

const sampleJob = `We are hiring a Product Data Analyst to help our product team understand customer behavior and improve activation, retention, and monetization. The ideal candidate has strong SQL skills, experience with experimentation, product analytics, dashboarding, and clear stakeholder communication.

Responsibilities
- Build dashboards and self-service reporting for product and growth teams.
- Analyze funnels, cohorts, retention, churn, and feature adoption.
- Partner with PMs, designers, and engineers on tracking plans and metric definitions.
- Present insights to executives and recommend product improvements.

Requirements
- 3+ years in product analytics, growth analytics, or business intelligence.
- Advanced SQL and experience with Python or R.
- Experience with Tableau, Looker, Power BI, Snowflake, or BigQuery.
- Familiarity with A/B testing, experimentation, and statistical reasoning.
- Excellent written and verbal communication.
- Bachelor's degree in statistics, economics, computer science, or a related quantitative field.`;

const skillBank = [
  "sql",
  "python",
  "r",
  "tableau",
  "looker",
  "power bi",
  "snowflake",
  "bigquery",
  "excel",
  "dashboard",
  "dashboards",
  "a/b testing",
  "experimentation",
  "statistics",
  "cohort analysis",
  "funnel analysis",
  "retention",
  "churn",
  "activation",
  "product analytics",
  "growth analytics",
  "business intelligence",
  "stakeholder communication",
  "tracking plans",
  "metric definitions",
  "executive presentation",
  "machine learning",
  "nlp",
  "api",
  "etl",
  "data visualization"
];

const roleProfiles = [
  {
    title: "Product Data Analyst",
    signals: ["sql", "product analytics", "dashboard", "a/b testing", "retention", "funnel analysis"]
  },
  {
    title: "Business Intelligence Analyst",
    signals: ["sql", "tableau", "power bi", "dashboard", "business intelligence", "etl"]
  },
  {
    title: "Growth Analyst",
    signals: ["growth analytics", "experimentation", "activation", "retention", "churn", "sql"]
  },
  {
    title: "Data Scientist",
    signals: ["python", "r", "statistics", "machine learning", "experimentation", "sql"]
  }
];

function normalize(text) {
  return text.toLowerCase().replace(/[^\w+#./\s-]/g, " ");
}

function countWords(text) {
  const words = text.trim().match(/\b[\w+#./-]+\b/g);
  return words ? words.length : 0;
}

function extractSkills(text) {
  const normalized = normalize(text);
  return skillBank.filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(^|[^a-z0-9+#/])${escaped}(?=$|[^a-z0-9+#/])`, "i");
    return pattern.test(normalized);
  });
}

function extractYears(text) {
  const matches = [...text.matchAll(/(\d+)\+?\s*(?:years|yrs)/gi)].map((match) => Number(match[1]));
  return matches.length ? Math.max(...matches) : 0;
}

function hasEducation(text) {
  return /\b(bachelor|master|degree|b\.s\.|m\.s\.|mba|phd|statistics|computer science|economics)\b/i.test(text);
}

function percent(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function setText(selector, value) {
  document.querySelector(selector).textContent = value;
}

function renderChips(containerId, items, emptyText) {
  const container = document.querySelector(containerId);
  container.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("span");
    empty.className = "chip";
    empty.textContent = emptyText;
    container.append(empty);
    return;
  }

  items.forEach((item) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = item;
    container.append(chip);
  });
}

function updateBar(id, value) {
  document.querySelector(id).style.width = `${value}%`;
}

function scoreRoles(resumeSkills) {
  return roleProfiles
    .map((profile) => {
      const hits = profile.signals.filter((signal) => resumeSkills.includes(signal)).length;
      return {
        ...profile,
        score: percent((hits / profile.signals.length) * 100)
      };
    })
    .sort((a, b) => b.score - a.score);
}

function buildRecommendations(missing, scores) {
  const recommendations = [];

  if (missing.length) {
    recommendations.push(`Add direct evidence for ${missing.slice(0, 5).join(", ")} using bullets with measurable outcomes.`);
  }

  if (scores.experience < 70) {
    recommendations.push("Mirror the job's experience language by naming relevant projects, business context, and years of ownership.");
  }

  if (scores.education < 70) {
    recommendations.push("Include a concise education or certifications line that matches the quantitative requirement.");
  }

  if (!/\d+%|\$\d+|\d+\s*(hours|hrs|days|users|customers|teams)/i.test(resumeInput.value)) {
    recommendations.push("Quantify more bullets with impact metrics such as conversion lift, time saved, revenue, churn reduction, or user scale.");
  }

  recommendations.push("Move the strongest matching skills into the top summary so recruiters and screening systems see them quickly.");
  return recommendations.slice(0, 5);
}

function analyze() {
  const resumeText = resumeInput.value;
  const jobText = jobInput.value;
  const resumeSkills = extractSkills(resumeText);
  const jobSkills = extractSkills(jobText);
  const matched = jobSkills.filter((skill) => resumeSkills.includes(skill));
  const missing = jobSkills.filter((skill) => !resumeSkills.includes(skill));

  const skillsScore = jobSkills.length ? percent((matched.length / jobSkills.length) * 100) : 0;
  const resumeYears = extractYears(resumeText);
  const jobYears = extractYears(jobText);
  const experienceScore = jobYears ? percent((Math.min(resumeYears, jobYears) / jobYears) * 100) : resumeYears ? 85 : 45;
  const educationScore = hasEducation(resumeText) && hasEducation(jobText) ? 100 : hasEducation(resumeText) ? 80 : 35;

  const skillsWeight = Number(document.querySelector("#skillsWeight").value);
  const experienceWeight = Number(document.querySelector("#experienceWeight").value);
  const educationWeight = Number(document.querySelector("#educationWeight").value);
  const totalWeight = skillsWeight + experienceWeight + educationWeight;
  const overall = percent(
    (skillsScore * skillsWeight + experienceScore * experienceWeight + educationScore * educationWeight) /
      totalWeight
  );

  setText("#matchScore", overall);
  setText("#skillsScore", `${skillsScore}%`);
  setText("#experienceScore", `${experienceScore}%`);
  setText("#educationScore", `${educationScore}%`);
  updateBar("#skillsBar", skillsScore);
  updateBar("#experienceBar", experienceScore);
  updateBar("#educationBar", educationScore);

  const ring = document.querySelector("#scoreRing");
  ring.style.strokeDashoffset = 414 - (414 * overall) / 100;
  ring.style.stroke = overall >= 80 ? "var(--teal)" : overall >= 60 ? "var(--amber)" : "var(--coral)";

  const label = overall >= 80 ? "Strong match" : overall >= 60 ? "Promising match" : "Needs tailoring";
  setText("#matchLabel", label);
  setText(
    "#matchSummary",
    `${matched.length} relevant signals matched, ${missing.length} high-value keywords still need clearer evidence.`
  );

  renderChips("#matchedSkills", matched, "No matched keywords yet");
  renderChips("#missingSkills", missing, "No keyword gaps found");

  const recommendationList = document.querySelector("#recommendations");
  recommendationList.innerHTML = "";
  buildRecommendations(missing, { experience: experienceScore, education: educationScore }).forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    recommendationList.append(li);
  });

  const roles = document.querySelector("#roleMatches");
  roles.innerHTML = "";
  scoreRoles(resumeSkills).forEach((role) => {
    const card = document.createElement("div");
    card.className = "role-card";
    card.innerHTML = `<div><strong>${role.title}</strong><br><span>${role.signals.join(", ")}</span></div><strong>${role.score}%</strong>`;
    roles.append(card);
  });
}

function updateCounts() {
  resumeCount.textContent = `${countWords(resumeInput.value)} words`;
  jobCount.textContent = `${countWords(jobInput.value)} words`;
}

function loadSample() {
  resumeInput.value = sampleResume;
  jobInput.value = sampleJob;
  updateCounts();
  analyze();
}

resumeInput.addEventListener("input", updateCounts);
jobInput.addEventListener("input", updateCounts);
analyzeButton.addEventListener("click", analyze);
sampleButton.addEventListener("click", loadSample);
document.querySelectorAll("input[type='range']").forEach((slider) => slider.addEventListener("input", analyze));

loadSample();
