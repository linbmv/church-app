import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback, useMemo, useRef } from "react"; // Added useCallback
import Card from "@mui/material/Card";
// REMOVED: TextField, MenuItem, Autocomplete, Grid, AddIcon, UploadFileIcon, CircularProgress
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import defaultProfilePic from "assets/images/default-profile-picture.png";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import {
  updatePerson,
  fetchPeople,
  createPerson,
  deletePerson,
  uploadProfilePicture,
} from "services/convo-broker.js";
import {
  RELATION_INVERSE_MAP,
  RELATION_AUTO_RECIPROCALS,
  RELATION_SUGGESTIONS,
} from "constants.js";

// Import your new sub-components
import PersonEditForm from "../../components/PersonDetail/PersonEditForm"; // Adjust path as needed
import PersonDisplay from "../../components/PersonDetail/PersonDisplay"; // Adjust path as needed

// REMOVED: Highlight, splitMatch (now imported in PersonEditForm)

// Define known fields that should NOT be treated as generic custom fields
const knownFields = [
  "_id",
  "id",
  "Name",
  "NameChi",
  "District",
  "Address",
  "Contact",
  "ProfilePic",
];

const normalizeTextValue = (value = "") => value.trim().toLowerCase();

const getInverseRelationLabel = (label = "") => {
  const normalized = normalizeTextValue(label);
  if (!normalized) {
    return label || "";
  }
  return RELATION_INVERSE_MAP[normalized] || label;
};

const getAutoReciprocalForRelation = (relation = "") => {
  const normalized = normalizeTextValue(relation);
  return RELATION_AUTO_RECIPROCALS[normalized] || "";
};

const propagateImmediateFamilyRelationships = async ({
  relationDetails,
  currentPerson,
  currentPersonGender,
  getFieldsForPerson,
  resolvePersonFromField,
  upsertRelationshipField,
  markPersonDirty,
}) => {
  let derivedCurrentGender = currentPersonGender || "";
  const childEntryMap = new Map();
  const spouseEntries = [];
  const parentEntries = [];
  const siblingEntries = [];

  const addChildEntry = (person, gender = "") => {
    if (!person || !person._id) return;
    const existing = childEntryMap.get(person._id);
    if (existing) {
      if (!existing.gender && gender) {
        existing.gender = gender;
      }
      return;
    }
    childEntryMap.set(person._id, { person, gender });
  };

  const collectChildrenFromFields = (fields) => {
    if (!fields) return;
    fields.forEach((field) => {
      if (!("value2" in field)) return;
      if (getRelationCategory(field.value2) !== "child") return;
      const relatedPerson = resolvePersonFromField(field);
      if (!relatedPerson) return;
      addChildEntry(
        relatedPerson,
        getGenderFromRelationType(field.value2 || "")
      );
    });
  };

  relationDetails.forEach(
    ({ category, person, targetGender = "", selfGender = "" }) => {
      if (!person || !category) return;
      if (!derivedCurrentGender && selfGender) {
        derivedCurrentGender = selfGender;
      }
      if (category === "child") {
        addChildEntry(person, targetGender);
      } else if (category === "spouse") {
        spouseEntries.push({ person, gender: targetGender });
      } else if (category === "parent") {
        parentEntries.push({ person, gender: targetGender });
      } else if (category === "sibling") {
        siblingEntries.push({ person, gender: targetGender });
      }
    }
  );

  collectChildrenFromFields(getFieldsForPerson(currentPerson));
  spouseEntries.forEach((spouse) => {
    collectChildrenFromFields(getFieldsForPerson(spouse.person));
  });

  const childEntries = Array.from(childEntryMap.values());
  const currentPersonFields =
    currentPerson && currentPerson._id
      ? getFieldsForPerson(currentPerson)
      : null;

  // Create sibling relationships among all child entries (when editing a parent)
  for (let i = 0; i < childEntries.length; i += 1) {
    for (let j = i + 1; j < childEntries.length; j += 1) {
      const firstChild = childEntries[i];
      const secondChild = childEntries[j];
      const firstFields = getFieldsForPerson(firstChild.person);
      const secondFields = getFieldsForPerson(secondChild.person);
      if (!firstFields || !secondFields) continue;

      const labelFirstToSecond = getSiblingLabelForGender(secondChild.gender);
      const reciprocalFirstToSecond = getSiblingLabelForGender(
        firstChild.gender
      );
      const labelSecondToFirst = getSiblingLabelForGender(firstChild.gender);
      const reciprocalSecondToFirst = getSiblingLabelForGender(
        secondChild.gender
      );

      if (
        upsertRelationshipField(
          firstFields,
          secondChild.person,
          labelFirstToSecond,
          reciprocalFirstToSecond
        )
      ) {
        markPersonDirty(firstChild.person);
      }
      if (
        upsertRelationshipField(
          secondFields,
          firstChild.person,
          labelSecondToFirst,
          reciprocalSecondToFirst
        )
      ) {
        markPersonDirty(secondChild.person);
      }
    }
  }

  // Link spouses to all children
  spouseEntries.forEach((spouse) => {
    const spouseFields = getFieldsForPerson(spouse.person);
    if (!spouseFields) return;
    const parentLabel = getParentLabelForGender(spouse.gender);
    childEntries.forEach((child) => {
      const childFields = getFieldsForPerson(child.person);
      if (!childFields) return;
      const childLabel = getChildLabelForGender(child.gender);

      if (
        upsertRelationshipField(
          spouseFields,
          child.person,
          childLabel,
          parentLabel
        )
      ) {
        markPersonDirty(spouse.person);
      }
      if (
        upsertRelationshipField(
          childFields,
          spouse.person,
          parentLabel,
          childLabel
        )
      ) {
        markPersonDirty(child.person);
      }
    });
  });

  // Link current person to all known children (including inherited ones)
  if (currentPersonFields && childEntries.length > 0) {
    const parentLabel = getParentLabelForGender(derivedCurrentGender || "");
    childEntries.forEach((child) => {
      const childFields = getFieldsForPerson(child.person);
      if (!childFields) return;
      const childLabel = getChildLabelForGender(child.gender);
      if (
        upsertRelationshipField(
          currentPersonFields,
          child.person,
          childLabel,
          parentLabel
        )
      ) {
        markPersonDirty(currentPerson);
      }
      if (
        upsertRelationshipField(
          childFields,
          currentPerson,
          parentLabel,
          childLabel
        )
      ) {
        markPersonDirty(child.person);
      }
    });
  }

  // If parents were specified, connect them to the current person and siblings
  if (parentEntries.length > 0) {
    const childrenForParents = [];
    if (currentPerson?._id) {
      childrenForParents.push({
        person: currentPerson,
        gender: derivedCurrentGender || "",
      });
    }
    siblingEntries.forEach((sibling) => {
      childrenForParents.push(sibling);
    });

    parentEntries.forEach((parent) => {
      const parentFields = getFieldsForPerson(parent.person);
      if (!parentFields) return;
      const parentLabel = getParentLabelForGender(parent.gender);
      childrenForParents.forEach((child) => {
        if (!child.person?._id) return;
        const childLabel = getChildLabelForGender(child.gender);
        const childFields = getFieldsForPerson(child.person);
        if (!childFields) return;
        if (
          upsertRelationshipField(
            parentFields,
            child.person,
            childLabel,
            parentLabel
          )
        ) {
          markPersonDirty(parent.person);
        }
        if (
          upsertRelationshipField(
            childFields,
            parent.person,
            parentLabel,
            childLabel
          )
        ) {
          markPersonDirty(child.person);
        }
      });
    });

    // Link siblings (including current person) together if multiple entries provided
    for (let i = 0; i < childrenForParents.length; i += 1) {
      for (let j = i + 1; j < childrenForParents.length; j += 1) {
        const firstChild = childrenForParents[i];
        const secondChild = childrenForParents[j];
        if (
          !firstChild?.person?._id ||
          !secondChild?.person?._id ||
          firstChild.person._id === secondChild.person._id
        ) {
          continue;
        }
        const firstFields = getFieldsForPerson(firstChild.person);
        const secondFields = getFieldsForPerson(secondChild.person);
        if (!firstFields || !secondFields) continue;
        const labelFirstToSecond = getSiblingLabelForGender(
          secondChild.gender
        );
        const reciprocalFirstToSecond = getSiblingLabelForGender(
          firstChild.gender
        );
        const labelSecondToFirst = getSiblingLabelForGender(
          firstChild.gender
        );
        const reciprocalSecondToFirst = getSiblingLabelForGender(
          secondChild.gender
        );

        if (
          upsertRelationshipField(
            firstFields,
            secondChild.person,
            labelFirstToSecond,
            reciprocalFirstToSecond
          )
        ) {
          markPersonDirty(firstChild.person);
        }
        if (
          upsertRelationshipField(
            secondFields,
            firstChild.person,
            labelSecondToFirst,
            reciprocalSecondToFirst
          )
        ) {
          markPersonDirty(secondChild.person);
        }
      }
    }
  }
};

const RELATION_CATEGORY_MAP = {
  son: "child",
  daughter: "child",
  child: "child",
  father: "parent",
  mother: "parent",
  parent: "parent",
  husband: "spouse",
  wife: "spouse",
  spouse: "spouse",
  brother: "sibling",
  sister: "sibling",
  sibling: "sibling",
};

const RELATION_GENDER_MAP = {
  son: "male",
  brother: "male",
  father: "male",
  husband: "male",
  grandson: "male",
  daughter: "female",
  sister: "female",
  mother: "female",
  wife: "female",
  granddaughter: "female",
};

const getRelationCategory = (relation = "") =>
  RELATION_CATEGORY_MAP[normalizeTextValue(relation)] || null;

const getGenderFromRelationType = (relation = "") =>
  RELATION_GENDER_MAP[normalizeTextValue(relation)] || "";

const getParentLabelForGender = (gender = "") => {
  if (gender === "male") return "Father";
  if (gender === "female") return "Mother";
  return "Parent";
};

const getChildLabelForGender = (gender = "") => {
  if (gender === "male") return "Son";
  if (gender === "female") return "Daughter";
  return "Child";
};

const getSiblingLabelForGender = (gender = "") => {
  if (gender === "male") return "Brother";
  if (gender === "female") return "Sister";
  return "Sibling";
};

function PersonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isAddMode = id === "add";

  // Core State for the Person Detail View
  const [person, setPerson] = useState(null); // The original person data (for view mode/discard)
  const [isEditing, setIsEditing] = useState(location.state?.edit || isAddMode);
  const [editedPerson, setEditedPerson] = useState(
    isAddMode ? { ProfilePic: "" } : null
  );
  const [customFields, setCustomFields] = useState([]);
  const [showNotFoundModal, setShowNotFoundModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [peopleList, setPeopleList] = useState([]); // List of all people for relationship suggestions
  const [relationshipFieldErrors, setRelationshipFieldErrors] = useState({});

  // Profile Picture Upload States (kept here as they are part of the save/discard flow)
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const profilePicProcessorRef = useRef(null);

  const breadcrumbRoute = useMemo(() => {
    const baseRoute = ["person-detail"];
    const trimmedEditedName = editedPerson?.Name?.trim() || "";
    const trimmedPersonName = person?.Name?.trim() || "";
    const displayName = trimmedEditedName || trimmedPersonName || "";
    if (displayName) {
      baseRoute.push(displayName);
    } else if (id) {
      baseRoute.push(id);
    }
    return baseRoute;
  }, [editedPerson?.Name, person?.Name, id]);

  // Utility function for determining relationship field data structure
  const isRelationshipFieldData = useCallback((fieldData) => {
    return (
      fieldData &&
      typeof fieldData === "object" &&
      "person" in fieldData &&
      "relation" in fieldData
    );
  }, []);

  // Function to initialize custom fields from person data
  const initializeCustomFields = useCallback(
    (personData) => {
      const initialCustomFields = [];
      Object.keys(personData || {}).forEach((key) => {
        if (!knownFields.includes(key)) {
          if (isRelationshipFieldData(personData[key])) {
            const relationValue = personData[key].relation || "";
            initialCustomFields.push({
              key: key,
              value: personData[key].person || "",
              value2: relationValue,
              value3:
                personData[key].reciprocal ||
                getAutoReciprocalForRelation(relationValue) ||
                "",
              personId:
                personData[key].personId ||
                personData[key].personID ||
                "",
            });
          } else {
            initialCustomFields.push({
              key: key,
              value: personData[key] || "",
            });
          }
        }
      });
      return initialCustomFields;
    },
    [knownFields, isRelationshipFieldData]
  ); // Dependencies for useCallback

  const buildPersonPayloadWithCustomFields = useCallback(
    (basePersonData = {}, fields = []) => {
      const data = { ...basePersonData };
      const existingDynamicKeys = Object.keys(basePersonData || {}).filter(
        (key) => !knownFields.includes(key)
      );
      existingDynamicKeys.forEach((key) => delete data[key]);

      fields.forEach((field, index) => {
        let actualKey = field.key;
        if (actualKey === "ProfilePic") {
          console.warn(
            "Attempted to save a custom field named 'ProfilePic'. Ignoring as this is a reserved field."
          );
          return;
        }
        if (!actualKey) {
          actualKey = `CustomField_${index}`;
        }
        if ("value2" in field) {
          const autoReciprocal = getAutoReciprocalForRelation(field.value2);
          data[actualKey] = {
            personId: field.personId || "",
            person: field.value || "",
            relation: field.value2 || "",
            reciprocal: field.value3 || autoReciprocal || "",
          };
        } else {
          data[actualKey] = field.value;
        }
      });

      return data;
    },
    []
  );

  const getRelationshipTargetKey = useCallback((field) => {
    if (!field) return "";
    return field.key || field.personId || normalizeTextValue(field.value || "");
  }, []);

  const findPersonForField = useCallback((people, field) => {
    if (!field) return null;
    if (field.personId) {
      return people.find((p) => p._id === field.personId) || null;
    }
    const name = (field.value || "").trim();
    if (!name) return null;
    return (
      people.find((p) => (p.Name || "").trim() === name) || null
    );
  }, []);

  const syncReciprocalRelationships = useCallback(
    async ({
      currentPersonName,
      currentPersonId,
      currentRelationships = [],
      previousRelationships = [],
    }) => {
      const trimmedCurrentName = (currentPersonName || "").trim();
      if (!trimmedCurrentName) {
        return;
      }

      let storedPeople = localStorage.getItem("people");
      if (!storedPeople) {
        await fetchPeople();
        storedPeople = localStorage.getItem("people");
      }
      if (!storedPeople) {
        return;
      }

      const people = JSON.parse(storedPeople);
      const findPersonByName = (name) =>
        people.find((p) => (p.Name || "").trim() === (name || "").trim());

      const prevTargets = new Map();
      previousRelationships.forEach((field) => {
        const key = getRelationshipTargetKey(field);
        if (key) {
          prevTargets.set(key, field);
        }
      });

      const currentTargets = new Map();
      currentRelationships.forEach((field) => {
        const key = getRelationshipTargetKey(field);
        if (key) {
          currentTargets.set(key, field);
        }
      });

      const currentPersonRef = {
        _id: currentPersonId || "",
        Name: currentPersonName || "",
      };
      const currentPersonFieldsSnapshot = JSON.parse(
        JSON.stringify(customFields || [])
      );
      const personById = new Map(people.map((person) => [person._id, person]));
      const personFieldsCache = new Map();
      const dirtyPersonIds = new Set();
      const relationDetails = [];
      let currentPersonGenderGuess = "";

      const getFieldsForPerson = (person) => {
        if (!person?._id) return null;
        if (currentPersonId && person._id === currentPersonId) {
          if (!personFieldsCache.has(person._id)) {
            const clonedFields = currentPersonFieldsSnapshot.map((field) => ({
              ...field,
            }));
            personFieldsCache.set(person._id, clonedFields);
          }
          return personFieldsCache.get(person._id);
        }
        if (!personFieldsCache.has(person._id)) {
          personFieldsCache.set(person._id, initializeCustomFields(person));
        }
        return personFieldsCache.get(person._id);
      };

      const markPersonDirty = (person) => {
        if (person?._id) {
          dirtyPersonIds.add(person._id);
        }
      };

      const upsertRelationshipField = (
        fields,
        targetPerson,
        relationLabel,
        reciprocalLabel
      ) => {
        if (!fields || !targetPerson || !relationLabel) {
          return false;
        }
        const targetId = targetPerson._id || "";
        const targetName = (targetPerson.Name || "").trim();
        const normalizedName = normalizeTextValue(targetName);
        let matchIndex = -1;
        if (targetId) {
          matchIndex = fields.findIndex(
            (field) => "value2" in field && field.personId === targetId
          );
        }
        if (matchIndex === -1 && normalizedName) {
          matchIndex = fields.findIndex(
            (field) =>
              "value2" in field &&
              normalizeTextValue(field.value || "") === normalizedName
          );
        }
        if (matchIndex >= 0) {
          const existing = fields[matchIndex];
          if (
            existing.value2 === relationLabel &&
            (reciprocalLabel
              ? existing.value3 === reciprocalLabel
              : true) &&
            (targetId ? existing.personId === targetId : true)
          ) {
            return false;
          }
          fields[matchIndex] = {
            ...existing,
            value: targetName || existing.value,
            value2: relationLabel,
            value3: reciprocalLabel || existing.value3 || "",
            personId: targetId || existing.personId || "",
          };
          return true;
        }
        fields.push({
          key: `Relationship_auto_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 8)}`,
          value: targetName,
          value2: relationLabel,
          value3: reciprocalLabel || "",
          personId: targetId,
        });
        return true;
      };

      const removeRelationshipField = (fields, referencePerson) => {
        if (!fields || !referencePerson) {
          return false;
        }
        const targetId = referencePerson._id || "";
        const normalizedName = normalizeTextValue(referencePerson.Name || "");
        const filtered = fields.filter((field) => {
          if (!("value2" in field)) return true;
          if (targetId && field.personId) {
            return field.personId !== targetId;
          }
          return normalizeTextValue(field.value || "") !== normalizedName;
        });
        if (filtered.length === fields.length) {
          return false;
        }
        fields.length = 0;
        filtered.forEach((field) => fields.push(field));
        return true;
      };

      for (const [targetKey, prevField] of prevTargets.entries()) {
        if (currentTargets.has(targetKey)) {
          continue;
        }
        const targetPerson = findPersonForField(people, prevField);
        if (!targetPerson) {
          continue;
        }
        const targetFields = getFieldsForPerson(targetPerson);
        if (!targetFields) continue;
        if (removeRelationshipField(targetFields, currentPersonRef)) {
          markPersonDirty(targetPerson);
        }
      }

      for (const [, relationshipField] of currentTargets.entries()) {
        const targetPerson = findPersonForField(people, relationshipField);
        if (!targetPerson || targetPerson._id === currentPersonId) {
          continue;
        }
        const relationCategory = getRelationCategory(
          relationshipField.value2 || ""
        );
        const targetGender = getGenderFromRelationType(
          relationshipField.value2 || ""
        );
        const selfGender = getGenderFromRelationType(
          relationshipField.value3 || ""
        );
        if (!currentPersonGenderGuess && selfGender) {
          currentPersonGenderGuess = selfGender;
        }
        relationDetails.push({
          field: relationshipField,
          person: targetPerson,
          category: relationCategory,
          targetGender,
          selfGender,
        });
        const targetFields = getFieldsForPerson(targetPerson);
        if (!targetFields) continue;
        const inverseRelation =
          relationshipField.value3 ||
          getInverseRelationLabel(relationshipField.value2 || "");
        if (
          upsertRelationshipField(
            targetFields,
            currentPersonRef,
            inverseRelation,
            relationshipField.value2 || ""
          )
        ) {
          markPersonDirty(targetPerson);
        }
      }

      await propagateImmediateFamilyRelationships({
        relationDetails,
        currentPerson: currentPersonRef,
        currentPersonGender: currentPersonGenderGuess,
        getFieldsForPerson,
        resolvePersonFromField: (field) => findPersonForField(people, field),
        upsertRelationshipField,
        markPersonDirty,
      });

      if (dirtyPersonIds.size > 0) {
        await Promise.all(
          Array.from(dirtyPersonIds).map((personId) => {
            const person = personById.get(personId);
            if (!person) {
              return null;
            }
            const fields = personFieldsCache.get(personId);
            if (!fields) {
              return null;
            }
            const payload = buildPersonPayloadWithCustomFields(person, fields);
            return updatePerson(personId, payload);
          })
        );
      }
    },
    [
      initializeCustomFields,
      buildPersonPayloadWithCustomFields,
      getRelationshipTargetKey,
      findPersonForField,
      updatePerson,
      fetchPeople,
      customFields,
    ]
  );

  // Effect to load person data on component mount or ID change
  useEffect(() => {
    if (!isAddMode) {
      const stored = localStorage.getItem("people");
      if (stored) {
        const people = JSON.parse(stored);
        const found = people.find((p) => p._id === id);
        if (found) {
          setPerson(found);
          setEditedPerson(found);
          setCustomFields(initializeCustomFields(found));
        } else {
          setShowNotFoundModal(true);
        }
      }
    } else {
      setEditedPerson({
        ProfilePic: "",
        Name: "",
        NameChi: "",
        District: "",
        Address: "",
        Contact: "",
      });
      setCustomFields([]);
    }
  }, [id, isAddMode, initializeCustomFields]);

  // Effect to load people list for relationship suggestions
  useEffect(() => {
    const stored = localStorage.getItem("people");
    if (stored) {
      const people = JSON.parse(stored);
      setPeopleList(people);
    }
  }, []);

  // Handlers for main actions (Edit, Save, Discard, Delete)
  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleProfilePicUpload = useCallback(
    async (fileOverride = null, personIdOverride = null) => {
      const fileToUpload = fileOverride || selectedFile;
      if (!fileToUpload) {
        return;
      }
      const targetPersonId = personIdOverride || id;
      if (!targetPersonId || targetPersonId === "add") {
        setUploadError(
          "Please create the person first before uploading an image."
        );
        return;
      }
      setUploadError(null);
      try {
        const response = await uploadProfilePicture(targetPersonId, fileToUpload);
        setEditedPerson((prev) => ({
          ...prev,
          ProfilePic: response.profilePicUrl,
        }));
        setSelectedFile(null);
        localStorage.removeItem("people");
        await fetchPeople();
      } catch (error) {
        console.error("Error uploading profile picture:", error);
        setUploadError(
          error.response?.data?.message ||
            "Failed to upload image. Please try again."
        );
      }
    },
    [selectedFile, id]
  );

  const handleSave = useCallback(async () => {
    try {
      const errors = {};
      let isValid = true;
      customFields.forEach((field, index) => {
        if (!("value2" in field)) {
          return;
        }
        const relationValue = field.value2 || "";
        const normalizedRelation = normalizeTextValue(relationValue);
        const relationValid = RELATION_SUGGESTIONS.some(
          (option) => normalizeTextValue(option) === normalizedRelation
        );
        if (!relationValid) {
          isValid = false;
          errors[index] = {
            ...(errors[index] || {}),
            relationType: "Please select a relation from the list.",
          };
        }
        const requiresReciprocal =
          relationValid && !getAutoReciprocalForRelation(relationValue);
        if (requiresReciprocal && !(field.value3 || "").trim()) {
          isValid = false;
          errors[index] = {
            ...(errors[index] || {}),
            reciprocal: "Please fill in this relation.",
          };
        }
      });
      setRelationshipFieldErrors(errors);
      if (!isValid) {
        return;
      }
      let pendingProfilePicFile = null;
      if (profilePicProcessorRef.current) {
        pendingProfilePicFile = await profilePicProcessorRef.current();
      }
      const dataToSave = buildPersonPayloadWithCustomFields(
        editedPerson,
        customFields
      );
      const currentRelationshipFields = customFields.filter((field) =>
        Object.prototype.hasOwnProperty.call(field, "value2")
      );
      const previousRelationshipFields = isAddMode
        ? []
        : initializeCustomFields(person || {}).filter((field) =>
            Object.prototype.hasOwnProperty.call(field, "value2")
          );
      if (isAddMode) {
        const createdPerson = await createPerson(dataToSave);
        const createdPersonId = createdPerson?._id || createdPerson?.id;
        await syncReciprocalRelationships({
          currentPersonId: createdPersonId,
          currentPersonName: dataToSave.Name || createdPerson?.Name || "",
          currentRelationships: currentRelationshipFields,
          previousRelationships: [],
        });
        if (pendingProfilePicFile && createdPersonId) {
          await handleProfilePicUpload(
            pendingProfilePicFile,
            createdPersonId
          );
        }
        localStorage.removeItem("people");
        await fetchPeople();
        const storedPeople = localStorage.getItem("people");
        if (storedPeople) {
          setPeopleList(JSON.parse(storedPeople));
        }
        navigate("/tables");
      } else {
        await updatePerson(id, dataToSave);
        if (pendingProfilePicFile) {
          await handleProfilePicUpload(pendingProfilePicFile);
        }
        await syncReciprocalRelationships({
          currentPersonId: id,
          currentPersonName: dataToSave.Name || person?.Name || "",
          currentRelationships: currentRelationshipFields,
          previousRelationships: previousRelationshipFields,
        });
        localStorage.removeItem("people");
        await fetchPeople();
        const stored = localStorage.getItem("people");
        if (stored) {
          const people = JSON.parse(stored);
          const found = people.find((p) => p._id === id);
          setPerson(found);
          setEditedPerson(found);
          setCustomFields(initializeCustomFields(found));
          setPeopleList(people);
        }
        setIsEditing(false);
      }
      setRelationshipFieldErrors({});
    } catch (error) {
      console.error("Failed to save:", error);
    }
  }, [
    editedPerson,
    customFields,
    isAddMode,
    id,
    person,
    navigate,
    initializeCustomFields,
    buildPersonPayloadWithCustomFields,
    syncReciprocalRelationships,
    handleProfilePicUpload,
  ]); // Dependencies for useCallback

  const handleDiscard = useCallback(() => {
    if (isAddMode) {
      navigate("/tables");
    } else {
      setEditedPerson(person); // Revert to original person data
      setCustomFields(initializeCustomFields(person)); // Revert custom fields
      setIsEditing(false);
      setSelectedFile(null); // Clear selected file
      setUploadError(null); // Clear upload error
      setRelationshipFieldErrors({});
    }
  }, [isAddMode, navigate, person, initializeCustomFields]);

  const handleDelete = useCallback(async () => {
    try {
      await deletePerson(id);
      localStorage.removeItem("people");
      await fetchPeople();
      navigate("/tables");
    } catch (error) {
      console.error("Failed to delete:", error);
    }
    setShowDeleteModal(false);
  }, [id, navigate]);

  // Handlers for editing person details (passed to PersonEditForm)
  const handleChange = useCallback((field, value) => {
    setEditedPerson((prev) => ({ ...prev, [field]: value }));
  }, []);

  const addCustomField = useCallback(() => {
    setCustomFields((prev) => [...prev, { key: "", value: "" }]);
    setRelationshipFieldErrors({});
  }, []);

  const addRelationshipField = useCallback(() => {
    const newRelationshipKey = `Relationship_${Date.now()}_${
      customFields.length
    }`;
    setCustomFields((prev) => [
      ...prev,
      { key: newRelationshipKey, value: "", value2: "", value3: "" },
    ]);
    setRelationshipFieldErrors({});
  }, [customFields.length]); // Dependency on customFields.length to ensure unique key

  const updateCustomField = useCallback((index, field, value) => {
    setCustomFields((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value }; // Ensure immutability
      return updated;
    });
  }, []);

  const removeCustomField = useCallback((index) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
    setRelationshipFieldErrors({});
  }, []);

  // Handlers for profile picture upload (passed to PersonEditForm)
  const handleFileChange = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
    }
  }, []);

  const registerProfilePicProcessor = useCallback((processor) => {
    profilePicProcessorRef.current = processor;
  }, []);

  // Modal Handlers
  const handleCloseModal = useCallback(() => {
    setShowNotFoundModal(false);
    navigate("/tables");
  }, [navigate]);

  if (!isAddMode && !person && !showNotFoundModal) return <div>Loading...</div>;

  // Attach original indices so remove/update actions work correctly after filtering
  const annotatedCustomFields = customFields.map((field, index) => ({
    ...field,
    originalIndex: index,
  }));
  // Filter customFields based on the presence of 'value2' (relationship)
  // and ensure 'ProfilePic' is not rendered as a generic custom field
  const personalInfoCustomFieldsForRender = annotatedCustomFields.filter(
    (field) => !("value2" in field) && field.key !== "ProfilePic"
  );
  const relationshipCustomFieldsForRender = annotatedCustomFields.filter(
    (field) => "value2" in field
  );

  return (
    <DashboardLayout>
      <DashboardNavbar customRoute={breadcrumbRoute} />
      <MDBox pt={6} pb={3}>
        <Card>
          {/* Header and Action Buttons (remain in parent as they control edit state) */}
          <MDBox
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            p={3}
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <MDTypography variant="h4">
              {isAddMode
                ? "Add Person"
                : isEditing
                ? "Edit Person"
                : "Person Details"}{" "}
            </MDTypography>
            <MDBox display="flex" gap={1}>
              {isEditing || isAddMode ? (
                <>
                  <MDButton
                    variant="gradient"
                    color="info"
                    onClick={handleSave}
                  >
                    {isAddMode ? "Add" : "Save"}
                  </MDButton>
                  <MDButton
                    variant="outlined"
                    color="secondary"
                    onClick={handleDiscard}
                  >
                    {isAddMode ? "Cancel" : "Discard"}
                  </MDButton>
                </>
              ) : (
                <>
                  <MDButton
                    variant="gradient"
                    color="info"
                    onClick={handleEdit}
                  >
                    Edit
                  </MDButton>
                  <MDButton
                    variant="gradient"
                    color="error"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    Delete
                  </MDButton>
                </>
              )}
            </MDBox>
          </MDBox>

          {/* Main content area: Conditionally render EditForm or Display */}
          <MDBox p={3}>
            {isEditing || isAddMode ? (
              <PersonEditForm
                editedPerson={editedPerson}
                personalInfoCustomFieldsForRender={
                  personalInfoCustomFieldsForRender
                }
                relationshipCustomFieldsForRender={
                  relationshipCustomFieldsForRender
                }
                relationshipFieldErrors={relationshipFieldErrors}
                peopleList={peopleList}
                defaultProfilePic={defaultProfilePic}
                // Pass all relevant handlers and states
                handleChange={handleChange}
                addCustomField={addCustomField}
                addRelationshipField={addRelationshipField}
                updateCustomField={updateCustomField}
                removeCustomField={removeCustomField}
                handleFileChange={handleFileChange}
                registerProfilePicProcessor={registerProfilePicProcessor}
                selectedFile={selectedFile}
                uploadError={uploadError}
              />
            ) : (
              <PersonDisplay
                person={person}
                personalInfoCustomFieldsForRender={
                  personalInfoCustomFieldsForRender
                }
                relationshipCustomFieldsForRender={
                  relationshipCustomFieldsForRender
                }
                peopleList={peopleList}
                defaultProfilePic={defaultProfilePic}
              />
            )}
          </MDBox>
        </Card>
      </MDBox>

      {/* Dialogs (remain in parent as they are general UI for the page) */}
      <Dialog open={showNotFoundModal} onClose={handleCloseModal}>
        <DialogTitle>Person Not Found</DialogTitle>
        <DialogContent>
          <MDTypography variant="body2">
            The person you are looking for does not exist.
          </MDTypography>
        </DialogContent>
        <DialogActions>
          <MDButton onClick={handleCloseModal} color="info">
            OK
          </MDButton>
        </DialogActions>
      </Dialog>
      <Dialog open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <DialogTitle>Delete Person</DialogTitle>
        <DialogContent>
          <MDTypography variant="body2">Delete this person?</MDTypography>
        </DialogContent>
        <DialogActions>
          <MDButton onClick={() => setShowDeleteModal(false)} color="secondary">
            Cancel
          </MDButton>
          <MDButton onClick={handleDelete} color="error">
            Delete
          </MDButton>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}

export default PersonDetail;
