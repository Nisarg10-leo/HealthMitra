// TestRail integration — moved verbatim from captureEvents.js (original lines 6359-7228).
// Load right after captureEvents.js (uses its globals). jira.js/azure.js call hideTestRailAlert/testRailsProjects at click time, so this file must stay included.

let testRailSettingsContainer = document.querySelector(".columns.testrail__settings");
let testRailHostnameInput = document.querySelector("#testrail-hostname");
let testRailUsernameInput = document.querySelector("#testrail-username");
let testRailApiKeyInput = document.querySelector("#testrail-apikey");

browserType.storage.local.get(["testRailInfo"], ({ testRailInfo }) => {
  if(!testRailInfo){
    return browserType.storage.local.set({
      testRailInfo: {
        hostname: "",
        username: "",
        api_key: "",
      }
    })
  }

  testRailHostnameInput.value = testRailInfo.hostname;
  testRailUsernameInput.value = testRailInfo.username;
  testRailApiKeyInput.value = testRailInfo.api_key;
});

testRailHostnameInput.addEventListener("blur", () => {
  unsetBorder()
  if(!testRailHostnameInput.value) testRailHostnameInput.style.border = "1px solid red";

  browserType.storage.local.get(["testRailInfo"], ({ testRailInfo }) => {
    if(testRailHostnameInput.value.toLowerCase().indexOf("https://") === 0){
      testRailInfo.hostname = testRailHostnameInput.value;
    }else if(testRailHostnameInput.value.toLowerCase().indexOf("https://") === -1){
      testRailInfo.hostname = `https://${testRailHostnameInput.value}`;
    }else{
      testRailInfo.hostname = testRailHostnameInput.value;
    }
    if(testRailHostnameInput.value) testRailHostnameInput.style.border = "1px solid #3d3c3c";
    browserType.storage.local.set({ testRailInfo });
  });
})

testRailUsernameInput.addEventListener("blur", () => {
  unsetBorder()
  if(!testRailUsernameInput.value) testRailUsernameInput.style.border = "1px solid red";
  browserType.storage.local.get(["testRailInfo"], ({ testRailInfo }) => {
    testRailInfo.username = testRailUsernameInput.value;
    if(testRailUsernameInput.value) testRailUsernameInput.style.border = "1px solid #3d3c3c";
    browserType.storage.local.set({ testRailInfo });
  });
})

testRailApiKeyInput.addEventListener("blur", () => {
  unsetBorder()
  if(!testRailApiKeyInput.value) testRailApiKeyInput.style.border = "1px solid red";
  browserType.storage.local.get(["testRailInfo"], ({ testRailInfo }) => {
    testRailInfo.api_key = testRailApiKeyInput.value;
    if(testRailApiKeyInput.value) testRailApiKeyInput.style.border = "1px solid #3d3c3c";
    browserType.storage.local.set({ testRailInfo });
  });
});

let defaultStepsTemplate = null;
let testRailTemplates = [];
let testRailCustomFields = [];

let selectedProjectId = null;
let selectedSectionId = null;
let selectedSuiteId = null;
let suiteDisplayed = null; 
let selectedTemplateId = null;
let testRailsProjects = [];
let testRailSections = [];

const getTestRailInfo = async () => {
  let { testRailInfo } = await browserType.storage.local.get(["testRailInfo"]);
  if(!testRailInfo.username || !testRailInfo.api_key || !testRailInfo.hostname){
    showSnackbar("Please enter TestRail Details.");
    return;
  };
  return testRailInfo;
}


const getTestRailProjects = async (withOffset) => {
  const testRailInfo = await getTestRailInfo();
  if(testRailInfo){
    const response = await fetch(`${testRailInfo.hostname}/index.php?/api/v2/get_projects${withOffset ? "&offset=250" : ""}`, {
      method: "get",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${window.btoa(`${testRailInfo.username}:${testRailInfo.api_key}`)}`
      },
    });

    if(response.status >= 400) throw new Error("Something Went Wrong");
    const data = await response.json();
      testRailUploadScreenShots.style.display = 'none';    
    return data;
  }
}

const getTestRailProjectSuites= async (projectId, withOffset) => {
  const testRailInfo = await getTestRailInfo();
  if(testRailInfo){
    const response = await fetch(`${testRailInfo.hostname}/index.php?/api/v2/get_suites/${projectId}${withOffset ? "&offset=250" : ""}`, {
      method: "get",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${window.btoa(`${testRailInfo.username}:${testRailInfo.api_key}`)}`
      },
    });

    if(response.status >= 400) throw new Error("Something Went Wrong");
    const data = await response.json();
    return data;
  }
};

const getTestRailProjectSections = async (projectId, withOffset) => {
  const testRailInfo = await getTestRailInfo();
  if(testRailInfo){
    let suiteIdUrl  = '';
    if(selectedSuiteId){
      suiteIdUrl  = '&suite_id='+selectedSuiteId;
      suiteDisplayed=true;
    }

    const response = await fetch(`${testRailInfo.hostname}/index.php?/api/v2/get_sections/${projectId}${suiteIdUrl}${withOffset ? "&offset=250" : ""}`, {
      method: "get",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${window.btoa(`${testRailInfo.username}:${testRailInfo.api_key}`)}`
      },
    });

    if(response.status >= 400) throw new Error("Something Went Wrong");
    const data = await response.json();
    return data;
  }
};

const getCustomTestRailFields = async () => {
  const testRailInfo = await getTestRailInfo();
  if(testRailInfo){
    const response = await fetch(`${testRailInfo.hostname}/index.php?/api/v2/get_case_fields`, {
      method: "get",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${window.btoa(`${testRailInfo.username}:${testRailInfo.api_key}`)}`
      },
    });

    if(response.status >= 400) throw new Error("Something Went Wrong");
    const data = await response.json();
    return data;
  }
}

const getTestRailProjectTemplates = async (projectId) => {
  const testRailInfo = await getTestRailInfo();
  if(testRailInfo){
    const response = await fetch(`${testRailInfo.hostname}/index.php?/api/v2/get_templates/${projectId}`, {
      method: "get",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${window.btoa(`${testRailInfo.username}:${testRailInfo.api_key}`)}`
      },
    });

    if(response.status >= 400) throw new Error("Something Went Wrong");
    const data = await response.json();
    return data;
  }
}

const getTestRailProjectMilestones = async (projectId) => {
  const testRailInfo = await getTestRailInfo();
  if(testRailInfo){
    const response = await fetch(`${testRailInfo.hostname}/index.php?/api/v2/get_milestones/${projectId}`, {
      method: "get",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${window.btoa(`${testRailInfo.username}:${testRailInfo.api_key}`)}`
      },
    });

    if(response.status >= 400) throw new Error("Something Went Wrong");
    const data = await response.json();
    return data;
  }
}

const uploadTestCasesToTestRail = async ({ sectionId, title, templateId, customFields, stepImageIds }) => {
  const testRailInfo = await getTestRailInfo();

  if(testRailInfo){
    const response = await fetch(`${testRailInfo.hostname}/index.php?/api/v2/add_case/${sectionId}`, {
      method: "post",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${window.btoa(`${testRailInfo.username}:${testRailInfo.api_key}`)}`
      },
      body: JSON.stringify({
        title,
        template_id: templateId,
        ...customFields
      })
    });
    if(response.status >= 400) throw new Error("Something Went Wrong");
    const data = await response.json();
    if(typeof data.id != 'undefined' && uploadWithScreenShots){
      await uploadStepScreenshotsInline({case_id: data.id, stepImageIds:stepImageIds});
    }
    return data;
  }
}

const uploadScreenShotsToTestRail = async ({ case_id, stepImageIds }) => {
  const testRailInfo = await getTestRailInfo();
  if(testRailInfo){
    stepImageIds.forEach(function(imageId){
        screenshotDb.get(imageId).then(buffer => {
          if (!buffer) return;

          var file = new File([buffer], 'image.jpg', { type: 'image/jpeg' });
          var form = new FormData();
          form.append("attachment", file);
          const response =  fetch(`${testRailInfo.hostname}/index.php?/api/v2/add_attachment_to_case/${case_id}`, {
            method: "post",
            headers: {
              "Authorization": `Basic ${window.btoa(`${testRailInfo.username}:${testRailInfo.api_key}`)}`,
            },
            body: form
          });
          if(response.status >= 400) throw new Error("Something Went Wrong");
          const data =  response.json();
          return data;
      });  
    })
  }
  return true; 
}

const uploadTestCases = async (templateId) => {
  let templateCustomFields = testRailCustomFields.filter(field => field.type_id === 10 || (field.is_active && field.configs.length > 0 && field.configs[0].options.is_required && (field.template_ids.includes(templateId) || field.include_all)));
  let stepsField = null;
  let readyToPostCustomFields = {};
  let noMilestones = false;
  let noUsers = false;
  let userFieldName = "";
  if(templateCustomFields.length > 0){
    for(let i=0; i<templateCustomFields.length; i++){
      let field = templateCustomFields[i];
      let testRailObject = null;
      switch(field.type_id){
        // String
        case 1:
          readyToPostCustomFields[field.system_name] = field.configs[0]?.options.default_value || "This field is filled by Testcase Studio";
          break;
        // Integer
        case 2:
          readyToPostCustomFields[field.system_name] = field.configs[0]?.options.default_value || 11111;
          break;
        // Text
        case 3:
          readyToPostCustomFields[field.system_name] = field.configs[0]?.options.default_value || "This field is filled by Testcase Studio";
          break;
        // URL
        case 4:
          readyToPostCustomFields[field.system_name] = field.configs[0]?.options.default_value || "https://example.com";
          break;
        // Checkbox
        case 5:
          readyToPostCustomFields[field.system_name] = field.configs[0]?.options.default_value || false;
          break;
        // Dropdown
        case 6:
          if(field.configs.length > 0){
            let itemId = field.configs[0].options.items.split(",")[0];
            readyToPostCustomFields[field.system_name] = Number(itemId);
          }
          break;
        // User
        case 7:
          noUsers = true;
          userFieldName = field.label;
          break;
        // Date
        case 8:
          let today = new Date();
          let day = today.getDate();
          let month = today.getMonth() + 1;
          let year = today.getFullYear();
          today = `${day}/${month}/${year}`;
          today = today.replace(/\d+/g, c => (c<10?'0':'') + +c);
          readyToPostCustomFields[field.system_name] = today;
          break;
        // Milestone
        case 9:
          testRailObject = await getTestRailProjectMilestones(selectedProjectId);
          if(testRailObject.milestones.length < 1){
            noMilestones = true;
          }else{
            readyToPostCustomFields[field.system_name] = testRailObject.milestones[0].id;
          }
          break;
        // Steps
        case 10:
          stepsField = field;
          break;
        // Multiselect
        case 12:
          if(field.configs.length > 0){
            let itemId = field.configs[0].options.items.split(",")[0];
            readyToPostCustomFields[field.system_name] = [Number(itemId)];
          }
          break;
        default:
          break;
        
      }
    }
  }

  if(noMilestones) return displayTestRailAlert("No Milestones Found", "error");
  if(noUsers) return displayTestRailAlert(`Please modify the field "${userFieldName}" to be optional in your TestRail Project`, "error");
  // return false;
  // Attribution: TestRail's "Preconditions" field is the one free-text field that is
  // not part of the steps, so the credit never looks like a test step. Only set when
  // the project actually has the field and the template left it empty.
  const trPreconds = testRailCustomFields.find(field =>
    field && field.system_name === "custom_preconds" && field.is_active);
  if(trPreconds && !readyToPostCustomFields["custom_preconds"]){
    readyToPostCustomFields["custom_preconds"] =
      "Recorded with TestCase Studio by SelectorsHub — https://selectorshub.com/testcase-studio/";
  }

  // Free tier: cap the run at today's remaining allowance. Cases are counted as
  // they are accepted, so a failed upload never eats part of the day's quota.
  let trAllowance = await tcsRemaining("testrail");
  if(trAllowance < 1){
    tcsOpenQuotaModal("testrail");
    return tcsShowLimitAlert(document.querySelector("#testrail-modal .testrail__alert"), "testrail");
  }

  let trUploaded = 0;
  for(let i=0; i<testCases.length; i++){
    let testCase = testCases[i];
    if(testCase.isChecked){
      if(trUploaded >= trAllowance) break;
      let stepImageIds = [];
      if(stepsField){
        readyToPostCustomFields[stepsField.system_name] = testCase.steps.map(step => ({ content: step.step, expected: step.expRes }));
        stepImageIds = testCase.steps.map(obj => obj.id);
      }
      await uploadTestCasesToTestRail({ sectionId: selectedSectionId, title: testCase.name, templateId, customFields: readyToPostCustomFields, stepImageIds:stepImageIds });
      trUploaded++;
      await tcsConsume("testrail", 1);
      tcsRefreshQuotaBadges();
    }
  }
  uploadWithScreenShots = false;
  testRailUploadScreenShots.innerText = "Upload with Screenshots";
  testRailUploadScreenShots.disabled = false;
  let [trMessage, trType] = trTakeUploadAlert();
  if(trUploaded){
    const trLeft = await tcsRemaining("testrail");
    if(!/[.)\]]$/.test(trMessage)) trMessage += ".";
    trMessage += trLeft
      ? ` ${trLeft} of ${TCS_DAILY_LIMIT} free TestRail uploads left today.`
      : ` That was your last free TestRail upload today — the limit resets tomorrow.`;
  }
  displayTestRailAlert(trMessage, trType);

  let testRailNextBtn = document.querySelector("#testrail-modal .next");
  testRailNextBtn.disabled = true;
}

let testRailAlert = document.querySelector(".testrail__alert");
const displayTestRailAlert = (message, type) => {
  testRailAlert.innerText = message;
  testRailAlert.classList.remove("success");
  testRailAlert.classList.remove("error");
  testRailAlert.classList.remove("info");

  if(type === "success") testRailAlert.classList.add("success");
  else if(type === "error") testRailAlert.classList.add("error");
  else testRailAlert.classList.add("info"); 
  testRailAlert.classList.remove("hideElement");
}

const toggleTestRailLoader = () => {
  let loading = document.querySelector(".testrail__loading");
  if(loading.classList.contains("hideElement")) loading.classList.remove("hideElement");
  else loading.classList.add("hideElement");
}

const hideTestRailAlert = () => {
  testRailAlert.classList.add("hideElement");
  testRailAlert.classList.remove("success");
  testRailAlert.classList.remove("error");
  testRailAlert.classList.remove("info");
  testRailAlert.innerText = "";
}
let testRailUploadBtn = document.querySelector("#save_btn_testrail");
let testRailModal = document.querySelector("#testrail-modal");
let testRailTitleEl = document.querySelector("#testrail-modal .title");
let testRailProjectsList = document.querySelector("#testrail-modal .testrail__projects");
let testRailSectionsList = document.querySelector("#testrail-modal .testrail__sections");
let testRailSuitesList = document.querySelector("#testrail-modal .testrail__suites");
let testRailTemplatesList = document.querySelector("#testrail-modal .testrail__templates");
let testRailNextBtn = document.querySelector("#testrail-modal .next");
let testRailUploadScreenShots = document.querySelector("#testrail-modal .upload-with-screen");
let uploadWithScreenShots = false;
let testRailCancelBtn = document.querySelector("#testrail-modal .cancel");
let testRailCloseBtn = document.querySelector("#testrail-modal .close__icon");
let instructionError = document.querySelector(".testrail__instructions__error");


testRailUploadBtn.addEventListener("click", async () => {
  try {
    testRailNextBtn.disabled = false;
    let checkedTestCases = testCases.filter(testCase => testCase.isChecked);
    if(testCases[0].steps.length < 1 || checkedTestCases.length < 1){
      showSnackbar("No Test Cases to Upload or Send");
      return;
    }

    // Free tier: stop before the project picker opens.
    if(!await tcsCheckQuota("testrail")) return;

    let { testRailInfo } = await browserType.storage.local.get(["testRailInfo"]);
    if(!testRailInfo || !testRailInfo.username || !testRailInfo.api_key || !testRailInfo.hostname){
      showSnackbar("Please enter TestRail Details.");
      if(testRailInfo){
        unsetBorder()
        if(!testRailInfo.username) testRailUsernameInput.style.border = "1px solid red";
        if(!testRailInfo.api_key) testRailApiKeyInput.style.border = "1px solid red";
        if(!testRailInfo.hostname) testRailHostnameInput.style.border = "1px solid red";
      }
      customizeModal.classList.remove("hideElement");
      uiConfigBtn.classList.remove("inactive");
      uiConfigBtn.classList.add("active");
      return;
    }

    toggleTestRailLoader();

    testRailProjectsList.innerHTML = "";
    testRailModal.classList.remove("hideElement");
    
    let testRailObject = await getTestRailProjects();
    suiteDisplayed = null; 
    let projects = testRailObject.projects;
    if(testRailObject.size === 250 && testRailObject._links.next){
      testRailObject = await getTestRailProjects(true);
      if(testRailObject && testRailObject.size > 0){
        projects = projects.concat(testRailObject.projects);
      }
    }

    if(projects.length < 1){
      toggleTestRailLoader();
      testRailNextBtn.disabled = true;
      return testRailProjectsList.innerText = "No Projects are found, create a Project in your TestRail account.";
    }
    // reverse the projects array to show the latest project on top
    projects.reverse();

    toggleTestRailLoader();
    testRailsProjects = projects;

    let defaultProjectId = null;
    let { testRailDefaultSelection } = await browserType.storage.local.get(["testRailDefaultSelection"]);
    if(testRailDefaultSelection){
      let sp = projects.filter(project => project.id === testRailDefaultSelection.projectId);
      if(sp.length > 0) defaultProjectId = testRailDefaultSelection.projectId;
    }

    projects.forEach((project, index) => {
      let el = document.createElement("div");
      el.classList.add("testrail__project");
      if(!defaultProjectId){
        if(index === 0){
          el.classList.add("selected");
          selectedProjectId = project.id;
        }
      }else{
        if(project.id === defaultProjectId){
          el.classList.add("selected");
          selectedProjectId = project.id;
        }
      }
      el.dataset.id = project.id;
      el.innerText = project.name;
      el.dataset.suite_mode =  project.suite_mode;
      el.addEventListener("click", () => {
        let testRailProjectsList = document.querySelector("#testrail-modal .testrail__projects");
        Array.from(testRailProjectsList.children).forEach(child => {
          child.classList.remove("selected");
        })
        el.classList.add("selected");
        selectedProjectId = project.id;
      })

      testRailProjectsList.appendChild(el);
    });
  } catch (err) {
    instructionError.classList.remove("hideElement");
    testRailNextBtn.disabled = true;
    toggleTestRailLoader();
  }
})

testRailUploadScreenShots.addEventListener("click", async () => {
  uploadWithScreenShots = true; 
  testRailNextBtn.click(); 
});

testRailNextBtn.addEventListener("click", async () => {
  testRailSuitesList.classList.add("hideElement");
  try {
    hideTestRailAlert();
    testRailNextBtn.disabled = true;
    instructionError.classList.add("hideElement");
    if(testRailNextBtn.getAttribute("data-step") === "0"){
      testRailSectionsList.innerHTML = "";
      testRailTitleEl.innerText = "Select Section";
      testRailNextBtn.setAttribute("data-step", 1);
      testRailNextBtn.innerText = "Upload";
      testRailCancelBtn.setAttribute("data-step", 1);
      testRailCancelBtn.innerText = "Back";
      
  
      testRailProjectsList.classList.add("hideElement");
      
      testRailSectionsList.classList.remove("hideElement");
      if(selectedProjectId){
        toggleTestRailLoader();
        let customTestRailFields = await getCustomTestRailFields();
        testRailCustomFields = customTestRailFields;

        let stepsField = customTestRailFields.filter(field => field.type_id === 10)[0];
        if(!stepsField || !stepsField.is_active){
          displayTestRailAlert("Steps custom field not found. create a new field of type 'steps' or activate it in your Testrail project", "error");
          toggleTestRailLoader();
          return;
        }

        let TestRailProjectSuites = [];
        let suite_mode = testRailsProjects.filter(onetest => onetest.id === selectedProjectId)[0].suite_mode;
        if(suite_mode == 2){
          toggleTestRailLoader();
          testRailNextBtn.disabled = true;
          return testRailSectionsList.innerText = "Suite Mode 2 is not supported.";
        }
        if(suite_mode == 3 && selectedSuiteId == null){
          TestRailProjectSuites = await getTestRailProjectSuites(selectedProjectId);
          if(TestRailProjectSuites.length<1){
            toggleTestRailLoader();
            testRailNextBtn.disabled = true;
            return testRailSectionsList.innerText = "No suite found, create a Suite in your project from TestRail.";
          }
          testRailTitleEl.innerText = "Select Suite";
          testRailSuitesList.innerHTML = "";
          TestRailProjectSuites.forEach((suite, index) => {
            let el = document.createElement("div");
            el.classList.add("testrail__suite");
            if(index === 0){
              el.classList.add("selected");
              selectedSuiteId = suite.id;
            }
            el.dataset.id = suite.id;
            el.innerText = suite.name;
    
            el.addEventListener("click", () => {
              let testRailSuitesList = document.querySelector("#testrail-modal .testrail__suites");
              Array.from(testRailSuitesList.children).forEach(child => {
                child.classList.remove("selected");
              })
              el.classList.add("selected");
              selectedSuiteId = suite.id;
            })
            testRailSuitesList.appendChild(el);
          });
          toggleTestRailLoader();
          testRailSectionsList.classList.add("hideElement");
          testRailSuitesList.classList.remove("hideElement");

          testRailNextBtn.setAttribute("data-step", 0);
          testRailNextBtn.innerText = "Next";
          testRailNextBtn.disabled = false;
          return false;
        }
        testRailSuitesList.classList.add("hideElement");
        let testRailObject = await getTestRailProjectSections(selectedProjectId);
        let sections = testRailObject.sections;
        if(testRailObject.size === 250 && testRailObject._links.next){
          testRailObject = await getTestRailProjectSections(selectedProjectId, true);
          if(testRailObject && testRailObject.size > 0){
            sections = sections.concat(testRailObject.sections);
          }
        }
        
        if(sections.length < 1){
          toggleTestRailLoader();
          testRailNextBtn.disabled = true;
          testRailSuitesList.classList.add("hideElement");
          return testRailSectionsList.innerText = "No Sections are found, create a Section in your project from TestRail.";
        }

        let testRailProjectTemplates = await getTestRailProjectTemplates(selectedProjectId);
        if(testRailProjectTemplates && testRailProjectTemplates.length > 0){
          testRailTemplates = testRailProjectTemplates;
          defaultStepsTemplate = testRailProjectTemplates.filter(template => template.name === "Test Case (Steps)")[0];
        }

        toggleTestRailLoader();

        let defaultSectionId = null;
        let { testRailDefaultSelection } = await browserType.storage.local.get(["testRailDefaultSelection"]);
        if(testRailDefaultSelection){
          let ss = sections.filter(section => section.id === testRailDefaultSelection.sectionId);
          if(ss.length > 0) defaultSectionId = testRailDefaultSelection.sectionId;
        }

        testRailSections = sections;
        sections.forEach((section, index) => {
          let el = document.createElement("div");
          el.classList.add("testrail__section");
          if(!defaultSectionId){
            if(index === 0){
              el.classList.add("selected");
              selectedSectionId = section.id;
            }
          }else{
            if(section.id === defaultSectionId){
              el.classList.add("selected");
              selectedSectionId = section.id;
            }
          }
          el.dataset.id = section.id;
          el.innerText = section.name;
  
          el.addEventListener("click", () => {
            let testRailSectionsList = document.querySelector("#testrail-modal .testrail__sections");
            Array.from(testRailSectionsList.children).forEach(child => {
              child.classList.remove("selected");
            })
            el.classList.add("selected");
            selectedSectionId = section.id;
          })
  
          testRailSectionsList.appendChild(el);
        })
        if(sections.length){
          testRailUploadScreenShots.style.display = 'block';
        }
      }
      testRailNextBtn.disabled = false;
      testRailSuitesList.classList.add("hideElement");
    }else if(testRailNextBtn.getAttribute("data-step") === "1"){
      if(uploadWithScreenShots){
        testRailUploadScreenShots.innerText = "Uploading...";
        testRailUploadScreenShots.disabled = true; 
      }else{
        testRailNextBtn.innerText = "Uploading...";
      }
      

      if(defaultStepsTemplate){
        await uploadTestCases(defaultStepsTemplate.id);
      }else{
        testRailTemplatesList.innerHTML = "";
        testRailTitleEl.innerText = "Select Template";
        testRailNextBtn.setAttribute("data-step", 2);
        testRailNextBtn.innerText = "Upload";
        testRailCancelBtn.setAttribute("data-step", 2);
        testRailCancelBtn.innerText = "Back";
      
        testRailSectionsList.classList.add("hideElement");
        testRailTemplatesList.classList.remove("hideElement");

        let defaultTemplateId = null;
        let { testRailDefaultSelection } = await browserType.storage.local.get(["testRailDefaultSelection"]);
        if(testRailDefaultSelection){
          let ss = testRailTemplates.filter(template => template.id === testRailDefaultSelection.templateId);
          if(ss.length > 0) defaultTemplateId = testRailDefaultSelection.templateId;
        }

        testRailTemplates.forEach((template, index) => {
          let el = document.createElement("div");
          el.classList.add("testrail__template");
          el.dataset.id = template.id;
          el.innerText = template.name;
          
          if(!defaultTemplateId){
            if(index === 0){
              el.classList.add("selected");
              selectedTemplateId = template.id;
            }
          }else{
            if(template.id === defaultTemplateId){
              el.classList.add("selected");
              selectedTemplateId = template.id;
            }
          }

          el.addEventListener("click", () => {
            let testRailTemplatesList = document.querySelector("#testrail-modal .testrail__templates");
            Array.from(testRailTemplatesList.children).forEach(child => {
              child.classList.remove("selected");
            })
            testRailNextBtn.disabled = false;
            el.classList.add("selected");
            selectedTemplateId = template.id;
          })

          testRailTemplatesList.appendChild(el);
        });
      }
      testRailNextBtn.innerText = "Upload";
      testRailNextBtn.disabled = false;
      browserType.storage.local.set({ testRailDefaultSelection: { projectId: selectedProjectId, sectionId: selectedSectionId, templateId: selectedTemplateId }})
    }else{
      let selectedTemplate = document.querySelector("#testrail-modal .testrail__templates .selected");
      if(selectedTemplate){
        let templateId = selectedTemplate.dataset.id;
        let stepsField = testRailCustomFields.filter(field => field.type_id === 10)[0];
        if(stepsField && stepsField.is_active){
          if(!stepsField.template_ids.includes(Number(templateId))) return displayTestRailAlert("This Template is not supported, please incorporate a custom field with the 'steps' type into this template.", "error");
          await uploadTestCases(templateId);
          testRailNextBtn.disabled = true;
        }else{
          testRailNextBtn.disabled = false;
          return displayTestRailAlert("Steps custom field not found. create a new field of type 'steps' or activate it in your Testrail project", "error");
        }
      }else{
        testRailNextBtn.disabled = false;
        displayTestRailAlert("Please select a template", "error");
      }

    }
  } catch (err) {
    // console.log(err)
    displayTestRailAlert("Something Went Wrong", "error");
    let loading = document.querySelector(".testrail__loading");
    loading.classList.add("hideElement");
    testRailNextBtn.disabled = false;
  }
})

testRailCancelBtn.addEventListener("click", async () => {
  testRailNextBtn.disabled = false;
  testRailUploadScreenShots.style.display = 'none';  
  hideTestRailAlert();
  if(suiteDisplayed){
    testRailTitleEl.innerText = "Select Suite";
    testRailSectionsList.classList.add("hideElement");
    testRailSuitesList.classList.remove("hideElement");
    suiteDisplayed = null;
    testRailNextBtn.setAttribute("data-step", "0");
    testRailNextBtn.innerText = "Next"; 
  }else if(testRailCancelBtn.getAttribute("data-step") === "1"){
    testRailProjectsList.innerHTML = "";
    testRailTitleEl.innerText = "Select Project";
    testRailNextBtn.setAttribute("data-step", 0);
    testRailNextBtn.innerText = "Next";
    testRailCancelBtn.setAttribute("data-step", 0);
    testRailCancelBtn.innerText = "Cancel";

    let defaultProjectId = null;
    selectedSuiteId = null;
    let { testRailDefaultSelection } = await browserType.storage.local.get(["testRailDefaultSelection"]);
    if(testRailDefaultSelection){
      let sp = testRailsProjects.filter(project => project.id === testRailDefaultSelection.projectId);
      if(sp.length > 0) defaultProjectId = testRailDefaultSelection.projectId;
    }

    testRailsProjects.forEach((project, index) => {
      let el = document.createElement("div");
      el.classList.add("testrail__project");
      el.dataset.id = project.id;
      el.innerText = project.name;

      if(!defaultProjectId){
        if(index === 0){
          el.classList.add("selected");
          selectedProjectId = project.id;
        }
      }else{
        if(project.id === defaultProjectId){
          el.classList.add("selected");
          selectedProjectId = project.id;
        }
      }

      el.addEventListener("click", () => {
        let testRailProjectsList = document.querySelector("#testrail-modal .testrail__projects");
        Array.from(testRailProjectsList.children).forEach(child => {
          child.classList.remove("selected");
        })
        el.classList.add("selected");
        selectedProjectId = project.id;
        

      })

      testRailProjectsList.appendChild(el);
    });

    testRailProjectsList.classList.remove("hideElement");
    testRailSectionsList.classList.add("hideElement");
    testRailSuitesList.classList.add("hideElement");
  }else if(testRailCancelBtn.getAttribute("data-step") === "2"){
    testRailSectionsList.innerHTML = "";
    testRailTitleEl.innerText = "Select Section";
    testRailNextBtn.setAttribute("data-step", 1);
    testRailNextBtn.innerText = "Upload";
    testRailCancelBtn.setAttribute("data-step", 1);
    testRailCancelBtn.innerText = "Back";

    let defaultSectionId = null;
    let { testRailDefaultSelection } = await browserType.storage.local.get(["testRailDefaultSelection"]);
    if(testRailDefaultSelection){
      let ss = testRailSections.filter(section => section.id === testRailDefaultSelection.sectionId);
      if(ss.length > 0) defaultSectionId = testRailDefaultSelection.sectionId;
    }

    testRailSections.forEach((section, index) => {
      let el = document.createElement("div");
      el.classList.add("testrail__section");
      if(!defaultSectionId){
        if(index === 0){
          el.classList.add("selected");
          selectedSectionId = section.id;
        }
      }else{
        if(section.id === defaultSectionId){
          el.classList.add("selected");
          selectedSectionId = section.id;
        }
      }
      el.dataset.id = section.id;
      el.innerText = section.name;

      el.addEventListener("click", () => {
        let testRailSectionsList = document.querySelector("#testrail-modal .testrail__sections");
        Array.from(testRailSectionsList.children).forEach(child => {
          child.classList.remove("selected");
        })
        el.classList.add("selected");
        selectedSectionId = section.id;
      })

      testRailSectionsList.appendChild(el);
    })

    if(testRailSections.length){
      testRailUploadScreenShots.style.display = 'block';
    }

    testRailTemplatesList.classList.add("hideElement");
    testRailSectionsList.classList.remove("hideElement");
    testRailSuitesList.classList.add("hideElement");
  }else{
    testRailModal.classList.add("hideElement");
    testRailSuitesList.classList.add("hideElement");
    testRailProjectsList.classList.remove("hideElement");
    testRailSectionsList.classList.add("hideElement");
    testRailTitleEl.innerText = "Select Project";
    testRailNextBtn.setAttribute("data-step", "0");
    testRailNextBtn.innerText = "Next";
    testRailCancelBtn.setAttribute("data-step", 0);
    testRailCancelBtn.innerText = "Cancel";
    testRailAlert.classList.add("hideElement");
    testRailAlert.classList.remove("success");
    testRailAlert.classList.remove("error");
    instructionError.classList.add("hideElement");
    testRailProjectsList.innerHTML = "";
    testRailSectionsList.innerHTML = "";
    testRailTemplatesList.innerHTML = "";
  }

  if(typeof sections !== "undefined" && sections.length){
    testRailUploadScreenShots.style.display = 'none';
  }
});

testRailCloseBtn.addEventListener("click", () => {
  testRailNextBtn.disabled = false;
  testRailModal.classList.add("hideElement");
  testRailProjectsList.classList.remove("hideElement");
  testRailSectionsList.classList.add("hideElement");
  testRailTitleEl.innerText = "Select Project";
  testRailNextBtn.setAttribute("data-step", "0");
  testRailNextBtn.innerText = "Next";
  testRailCancelBtn.setAttribute("data-step", 0);
  testRailCancelBtn.innerText = "Cancel";
  testRailAlert.classList.add("hideElement");
  testRailAlert.classList.remove("success");
  testRailAlert.classList.remove("error");
  instructionError.classList.add("hideElement");
  testRailProjectsList.innerHTML = "";
  testRailSectionsList.innerHTML = "";
  testRailTemplatesList.innerHTML = "";
})


// ═══════════════════════════════════════════════════════════════════════════
// Build 2 — TestRail screenshots placed inside their steps (v2.6.6)
// ─────────────────────────────────────────────────────────────────────────────
// Flow per uploaded case (only when "Upload with Screenshots" is used):
//   1. upload each step screenshot with add_attachment_to_case (sequential, awaited)
//   2. read the case back with get_case
//   3. append ![](index.php?/attachments/get/<id>) to each step's content, update_case
// If step 2/3 fails, screenshots still stay attached to the case (the pre-2.6.6
// behaviour) and the user gets a warning instead of a false "success".
// The plain "Upload" button path is unchanged.
// ═══════════════════════════════════════════════════════════════════════════

const trScreenshotRun = { issues: [], progress: null };
const trResetScreenshotRun = () => {
  trScreenshotRun.issues = [];
  trScreenshotRun.progress = null;
  trHideProgress();
};

const trPlural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// ── Upload progress (only for "Upload with Screenshots") ──
const trProgressEl = document.createElement("div");
trProgressEl.className = "tr-shot-progress hideElement";
trProgressEl.setAttribute("role", "progressbar");
trProgressEl.setAttribute("aria-valuemin", "0");
trProgressEl.setAttribute("aria-valuemax", "100");
trProgressEl.innerHTML =
  '<div class="tr-shot-progress__label"></div>' +
  '<div class="tr-shot-progress__track"><div class="tr-shot-progress__bar"></div></div>' +
  '<div class="tr-shot-progress__sub"></div>';
testRailAlert.insertAdjacentElement("afterend", trProgressEl);

const trHideProgress = () => {
  trProgressEl.classList.add("hideElement");
  trProgressEl.classList.remove("is-indeterminate");
};

const trRenderProgress = () => {
  const p = trScreenshotRun.progress;
  if (!p) return trHideProgress();
  const known = !p.counting && p.total > 0;
  const pct = known ? Math.min(100, Math.round((p.processed * 100) / p.total)) : 0;
  trProgressEl.querySelector(".tr-shot-progress__label").innerText = p.counting
    ? "Preparing screenshots..."
    : (p.total ? `Uploading screenshots: ${p.processed} of ${p.total}` : "Uploading test cases...");
  let sub = p.totalCases ? `Test case ${Math.min(Math.max(p.caseIndex, 1), p.totalCases)} of ${p.totalCases}` : "";
  if (p.stage === "place") sub += `${sub ? " · " : ""}adding screenshots to steps`;
  trProgressEl.querySelector(".tr-shot-progress__sub").innerText = sub;
  trProgressEl.querySelector(".tr-shot-progress__bar").style.width = known ? `${pct}%` : "";
  trProgressEl.classList.toggle("is-indeterminate", !known);
  trProgressEl.setAttribute("aria-valuenow", String(pct));
  trProgressEl.classList.remove("hideElement");
  testRailUploadScreenShots.innerText = known ? `Uploading ${p.processed}/${p.total}...` : "Uploading...";
};

// Totals come from the checked test cases (the same ones uploadTestCases() uploads).
const trStartProgress = () => {
  if (trScreenshotRun.progress) return trScreenshotRun.progress;
  const all = (typeof testCases !== "undefined" && Array.isArray(testCases)) ? testCases : [];
  const checked = all.filter(tc => tc && tc.isChecked);
  const idsPerCase = checked.map(tc => new Set((tc.steps || []).map(step => step && step.id).filter(Boolean)));
  const countIds = (keep) => idsPerCase.reduce((n, ids) => n + [...ids].filter(keep).length, 0);
  const progress = { total: countIds(() => true), processed: 0, uploaded: 0, placed: 0,
    totalCases: checked.length, caseIndex: 0, stage: "upload", storedKeys: null, ready: null, counting: true };
  trScreenshotRun.progress = progress;
  // Count only screenshots that really exist in storage (key listing, no image reads).
  progress.ready = (async () => {
    try {
      if (!screenshotDb || typeof screenshotDb.list !== "function") return;
      const keys = new Set(await screenshotDb.list());
      progress.storedKeys = keys;
      progress.total = countIds(id => keys.has(id));
      if (trScreenshotRun.progress === progress) trRenderProgress();
    } catch (e) { /* keep the step-based total */ }
    progress.counting = false;
    if (trScreenshotRun.progress === progress) trRenderProgress();
  })();
  trRenderProgress();
  return progress;
};

const trTakeUploadAlert = () => {
  const issues = trScreenshotRun.issues;
  const p = trScreenshotRun.progress;
  trResetScreenshotRun();
  const shown = issues.slice(0, 3).join("; ");
  const more = issues.length > 3 ? ` (+${issues.length - 3} more)` : "";
  if (!p) {   // plain "Upload": unchanged message
    if (!issues.length) return ["Test Cases Uploaded Successfully", "success"];
    return [`Test Cases Uploaded, but some screenshots need attention: ${shown}${more}`, "info"];
  }
  if (!issues.length) {
    return [p.total
      ? `Test Cases Uploaded Successfully. ${trPlural(p.placed, "screenshot")} added to steps.`
      : "Test Cases Uploaded Successfully. No screenshots found in the selected test cases.", "success"];
  }
  return [`Test Cases Uploaded. ${p.placed} of ${trPlural(p.total, "screenshot")} added to steps. Needs attention: ${shown}${more}`, "info"];
};

const trAuthHeader = (info) => `Basic ${window.btoa(`${info.username}:${info.api_key}`)}`;

// Screenshots are normally JPEG; edited screenshots (editimage.js) are PNG.
const trSniffImage = async (data) => {
  try {
    let bytes = null;
    if (data instanceof Blob) bytes = new Uint8Array(await data.slice(0, 4).arrayBuffer());
    else if (data instanceof ArrayBuffer) bytes = new Uint8Array(data, 0, Math.min(4, data.byteLength));
    else if (ArrayBuffer.isView(data)) bytes = new Uint8Array(data.buffer, data.byteOffset, Math.min(4, data.byteLength));
    if (bytes && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      return { ext: "png", type: "image/png" };
    }
  } catch (e) { /* fall back to jpeg */ }
  return { ext: "jpg", type: "image/jpeg" };
};

// Same field uploadTestCases() posts the steps into (last active 'steps' type field),
// confirmed against the case read back from TestRail (step count must match).
const trFindStepsFieldName = (caseData, stepCount) => {
  const names = testRailCustomFields
    .filter(field => field && field.type_id === 10 && field.system_name)
    .map(field => field.system_name)
    .reverse();
  for (const name of names) {
    if (Array.isArray(caseData[name]) && caseData[name].length === stepCount) return name;
  }
  for (const name of Object.keys(caseData)) {
    const value = caseData[name];
    if (name.indexOf("custom_") === 0 && Array.isArray(value) && value.length === stepCount &&
        value.every(step => step && typeof step === "object" && ("content" in step || "shared_step_id" in step))) {
      return name;
    }
  }
  return null;
};

// TestRail 9.7+ (rich text editor) stores step text as HTML, so a Markdown image line
// is shown as plain text there. Detect the format from the case TestRail returns.
const TR_HTML_TAG_RE = /<\/?(p|br|div|span|img|strong|em|u|s|ul|ol|li|h[1-6]|pre|code|blockquote|table)\b[^>]*>/i;
const trStepsUseHtml = (caseData, steps) => {
  const texts = [];
  (steps || []).forEach(step => { if (step) texts.push(step.content, step.expected, step.additional_info); });
  Object.keys(caseData || {}).forEach(key => {
    if (key.indexOf("custom_") === 0 && typeof caseData[key] === "string") texts.push(caseData[key]);
  });
  return texts.some(text => typeof text === "string" && TR_HTML_TAG_RE.test(text));
};

const trEscapeAttr = (value) => String(value)
  .replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Same markup TestRail's editor writes when an attachment image is inserted into a step.
const trImageHtml = (attachmentId, caseId) => {
  const id = trEscapeAttr(attachmentId);
  const src = `index.php?/attachments/get/${id}`;
  return `<p><img src="${src}" class="fr-fic fr-dib fr-fil markdown-img" width="300" ` +
    `id="attachment-${id}" data-attachment-id="${id}" data-entity-id="${trEscapeAttr(caseId)}" ` +
    `data-original-src="${src}"></p>`;
};

const uploadStepScreenshotsInline = async ({ case_id, stepImageIds }) => {
  const caseLabel = `C${case_id}`;
  try {
    const progress = trStartProgress();
    await progress.ready;
    progress.caseIndex++;
    progress.stage = "upload";
    trRenderProgress();
    if (!Array.isArray(stepImageIds) || !stepImageIds.some(Boolean)) return true;
    if (!screenshotDb) {
      trScreenshotRun.issues.push(`${caseLabel}: screenshot storage not available`);
      return true;
    }
    const testRailInfo = await getTestRailInfo();
    if (!testRailInfo) return true;

    testRailUploadScreenShots.disabled = true;
    trRenderProgress();

    // 1. upload screenshots one by one
    const attachmentByStep = {};   // step index -> attachment id
    const attachmentByImage = {};  // screenshot id -> attachment id (steps can share one screenshot)
    let failed = 0;
    let lastError = "";
    const countedImages = new Set();
    const countImage = (imageId) => {
      if (countedImages.has(imageId)) return;
      countedImages.add(imageId);
      progress.processed++;
      trRenderProgress();
    };
    for (let i = 0; i < stepImageIds.length; i++) {
      const imageId = stepImageIds[i];
      if (!imageId) continue;
      if (attachmentByImage[imageId] != null) {
        attachmentByStep[i] = attachmentByImage[imageId];
        continue;
      }
      let data = null;
      try { data = await screenshotDb.get(imageId); } catch (e) { data = null; }
      if (!data) {
        if (!progress.storedKeys || progress.storedKeys.has(imageId)) countImage(imageId);
        continue;
      }

      const { ext, type } = await trSniffImage(data);
      const form = new FormData();
      form.append("attachment", new File([data], `step-${i + 1}.${ext}`, { type }));
      try {
        const response = await fetch(`${testRailInfo.hostname}/index.php?/api/v2/add_attachment_to_case/${case_id}`, {
          method: "post",
          headers: { "Authorization": trAuthHeader(testRailInfo) },
          body: form
        });
        if (response.status >= 400) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        if (!result || result.attachment_id == null) throw new Error("no attachment id returned");
        attachmentByImage[imageId] = result.attachment_id;
        attachmentByStep[i] = result.attachment_id;
        progress.uploaded++;
      } catch (err) {
        failed++;
        lastError = (err && err.message) || "upload failed";
      }
      countImage(imageId);
    }
    if (failed) {
      trScreenshotRun.issues.push(`${caseLabel}: ${trPlural(failed, "screenshot")} could not be uploaded (${lastError})`);
    }
    if (!Object.keys(attachmentByStep).length) return true;

    // 2 + 3. place the uploaded screenshots inside their steps
    progress.stage = "place";
    trRenderProgress();
    try {
      const caseResponse = await fetch(`${testRailInfo.hostname}/index.php?/api/v2/get_case/${case_id}`, {
        method: "get",
        headers: { "Content-Type": "application/json", "Authorization": trAuthHeader(testRailInfo) }
      });
      if (caseResponse.status >= 400) throw new Error(`HTTP ${caseResponse.status} reading case`);
      const caseData = await caseResponse.json();

      const fieldName = trFindStepsFieldName(caseData || {}, stepImageIds.length);
      if (!fieldName) throw new Error("steps field not found on case");

      const useHtml = trStepsUseHtml(caseData, caseData[fieldName]);
      console.info(`[TCS Pro] TestRail ${caseLabel}: step image format = ${useHtml ? "HTML (rich text editor)" : "Markdown"}`,
        { firstStepContent: (caseData[fieldName][0] || {}).content });

      const steps = caseData[fieldName].map((step, i) => {
        if (step.shared_step_id) return { shared_step_id: step.shared_step_id };
        const out = { content: step.content || "", expected: step.expected || "" };
        if (step.additional_info) out.additional_info = step.additional_info;
        if (step.refs) out.refs = step.refs;
        if (attachmentByStep[i] != null) {
          if (useHtml) {
            out.content += trImageHtml(attachmentByStep[i], case_id);
          } else {
            out.content += `${out.content ? "\n" : ""}![](index.php?/attachments/get/${attachmentByStep[i]})`;
          }
        }
        return out;
      });

      const updateResponse = await fetch(`${testRailInfo.hostname}/index.php?/api/v2/update_case/${case_id}`, {
        method: "post",
        headers: { "Content-Type": "application/json", "Authorization": trAuthHeader(testRailInfo) },
        body: JSON.stringify({ [fieldName]: steps })
      });
      if (updateResponse.status >= 400) throw new Error(`HTTP ${updateResponse.status} updating steps`);
      progress.placed += Object.keys(attachmentByImage).length;
    } catch (err) {
      trScreenshotRun.issues.push(`${caseLabel}: screenshots are in the case attachments but could not be placed in steps (${(err && err.message) || "error"})`);
    }
  } catch (err) {
    trScreenshotRun.issues.push(`${caseLabel}: screenshot upload failed (${(err && err.message) || "error"})`);
  }
  return true;
};

// ── Button state: "Upload with Screenshots" applies only to the click that used it ──
// Capture phase on the modal runs before the buttons' own click handlers.
let trClickFromScreenshotBtn = false;
testRailModal.addEventListener("click", (e) => {
  const target = e.target;
  if (!target || typeof target.closest !== "function") return;
  if (target.closest(".upload-with-screen")) {
    trClickFromScreenshotBtn = true;          // its handler clicks Next synchronously
    setTimeout(() => { trClickFromScreenshotBtn = false; }, 0);
    trResetScreenshotRun();
    return;
  }
  if (target.closest(".next")) {
    if (trClickFromScreenshotBtn) {
      trClickFromScreenshotBtn = false;
    } else {
      uploadWithScreenShots = false;           // plain Next / Upload never uploads screenshots
      trResetScreenshotRun();
    }
  }
}, true);

const trRestoreScreenshotButton = () => {
  uploadWithScreenShots = false;
  trScreenshotRun.progress = null;
  trHideProgress();
  testRailUploadScreenShots.innerText = "Upload with Screenshots";
  testRailUploadScreenShots.disabled = false;
};

// Template picker shown (no "Test Case (Steps)" template): let the user choose again
// between Upload and Upload with Screenshots instead of leaving the button stuck.
new MutationObserver(() => {
  if (!testRailTemplatesList.classList.contains("hideElement")) trRestoreScreenshotButton();
}).observe(testRailTemplatesList, { attributes: true, attributeFilter: ["class"] });

// Any error shown in the modal: un-stick both upload buttons.
new MutationObserver(() => {
  if (!testRailAlert.classList.contains("error")) return;
  trRestoreScreenshotButton();
  if (testRailNextBtn.innerText === "Uploading...") testRailNextBtn.innerText = "Upload";
}).observe(testRailAlert, { attributes: true, attributeFilter: ["class"] });

// Show the progress bar right away (before the first case is created).
new MutationObserver(() => {
  if (uploadWithScreenShots && testRailUploadScreenShots.innerText === "Uploading...") trStartProgress();
}).observe(testRailUploadScreenShots, { childList: true, characterData: true, subtree: true });
