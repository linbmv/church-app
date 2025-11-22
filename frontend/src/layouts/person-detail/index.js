import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Card from "@mui/material/Card";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import MenuItem from "@mui/material/MenuItem";
import Autocomplete from "@mui/material/Autocomplete";
import { styled } from "@mui/material/styles";
import Grid from "@mui/material/Grid";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CircularProgress from "@mui/material/CircularProgress";
import defaultProfilePic from "assets/images/default-profile-picture.png"; // Make sure this path is correct
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

const SG_DISTRICTS = [
  "Ang Mo Kio",
  "Bedok",
  "Bishan",
  "Bukit Batok",
  "Bukit Merah",
  "Bukit Panjang",
  "Bukit Timah",
  "Central Area",
  "Choa Chu Kang",
  "Clementi",
  "Geylang",
  "Hougang",
  "Jurong East",
  "Jurong West",
  "Kallang",
  "Marine Parade",
  "Pasir Ris",
  "Punggol",
  "Queenstown",
  "Sembawang",
  "Sengkang",
  "Serangoon",
  "Tampines",
  "Toa Payoh",
  "Woodlands",
  "Yishun",
];
const FIELD_NAME_SUGGESTIONS = [
  "Baptism Date",
  "Cell Group",
  "Role",
  "Notes",
  "Emergency Contact",
];
const RELATION_SUGGESTIONS = [
  "Father",
  "Mother",
  "Son",
  "Daughter",
  "Brother",
  "Sister",
  "Husband",
  "Wife",
  "Grandfather",
  "Grandmother",
  "Uncle",
  "Aunt",
  "Cousin",
  "Friend",
  "Colleague",
  "Spouse",
];

const Highlight = styled("span")({
  fontWeight: 600,
});

function splitMatch(label, query) {
  if (!query) return [label, null, ""];
  const lowerLabel = label.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerLabel.indexOf(lowerQuery);
  if (index === -1) return [label, null, ""];
  return [
    label.slice(0, index),
    label.slice(index, index + query.length),
    label.slice(index + query.length),
  ];
}

function PersonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isAddMode = id === "add";

  const [person, setPerson] = useState(null);
  const [isEditing, setIsEditing] = useState(location.state?.edit || isAddMode);
  const [editedPerson, setEditedPerson] = useState(
    isAddMode ? { ProfilePic: "" } : null
  );
  const [customFields, setCustomFields] = useState([]);
  const [showNotFoundModal, setShowNotFoundModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [peopleList, setPeopleList] = useState([]);

  // Profile Picture Upload States
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Define known fields that should NOT be treated as generic custom fields
  // ProfilePic is explicitly handled by the image upload/display logic
  const knownFields = [
    "_id",
    "id",
    "Name",
    "NameChi",
    "District",
    "Address",
    "Contact",
    "ProfilePic", // This ensures ProfilePic is skipped by custom field logic
  ];

  const isRelationshipFieldData = (fieldData) => {
    return (
      fieldData &&
      typeof fieldData === "object" &&
      "person" in fieldData &&
      "relation" in fieldData
    );
  };

  const initializeCustomFields = (personData) => {
    const initialCustomFields = [];
    Object.keys(personData || {}).forEach((key) => {
      // Only add to customFields if it's NOT a known field AND not the ProfilePic field
      if (!knownFields.includes(key)) {
        if (isRelationshipFieldData(personData[key])) {
          initialCustomFields.push({
            key: key,
            value: personData[key].person || "",
            value2: personData[key].relation || "",
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
  };

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
  }, [id, isAddMode]);

  useEffect(() => {
    const stored = localStorage.getItem("people");
    if (stored) {
      const people = JSON.parse(stored);
      setPeopleList(people);
    }
  }, []);

  const personNameOptions = peopleList
    .map((p) => p.Name)
    .filter((name) => !!name);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const dataToSave = { ...editedPerson };

      // Clear existing dynamic fields from dataToSave before re-applying
      const existingDynamicKeys = Object.keys(person || {}).filter(
        (key) => !knownFields.includes(key)
      );
      existingDynamicKeys.forEach((key) => delete dataToSave[key]);

      // Apply custom fields from the current state
      customFields.forEach((field, index) => {
        let actualKey = field.key;
        // IMPORTANT: Prevent custom field from being named ProfilePic
        if (actualKey === "ProfilePic") {
          console.warn(
            "Attempted to save a custom field named 'ProfilePic'. Ignoring as this is a reserved field."
          );
          return; // Skip this custom field
        }
        if (!actualKey) {
          actualKey = `CustomField_${index}`;
        }
        if ("value2" in field) {
          dataToSave[actualKey] = {
            person: field.value || "",
            relation: field.value2 || "",
          };
        } else {
          dataToSave[actualKey] = field.value;
        }
      });

      if (isAddMode) {
        await createPerson(dataToSave);
        localStorage.removeItem("people");
        await fetchPeople();
        navigate("/tables");
      } else {
        await updatePerson(id, dataToSave);
        localStorage.removeItem("people");
        await fetchPeople();
        const stored = localStorage.getItem("people");
        if (stored) {
          const people = JSON.parse(stored);
          const found = people.find((p) => p._id === id);
          setPerson(found);
          setEditedPerson(found);
          setCustomFields(initializeCustomFields(found));
        }
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Failed to save:", error);
    }
  };

  const handleDiscard = () => {
    if (isAddMode) {
      navigate("/tables");
    } else {
      setEditedPerson(person);
      setCustomFields(initializeCustomFields(person));
      setIsEditing(false);
      setSelectedFile(null);
      setUploadError(null);
    }
  };

  const handleChange = (field, value) => {
    setEditedPerson({ ...editedPerson, [field]: value });
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { key: "", value: "" }]);
  };

  const addRelationshipField = () => {
    const newRelationshipKey = `Relationship_${Date.now()}_${
      customFields.length
    }`;
    setCustomFields([
      ...customFields,
      { key: newRelationshipKey, value: "", value2: "" },
    ]);
  };

  const updateCustomField = (index, field, value) => {
    const updated = [...customFields];
    updated[index][field] = value;
    setCustomFields(updated);
  };

  const removeCustomField = (index) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const handleCloseModal = () => {
    setShowNotFoundModal(false);
    navigate("/tables");
  };

  const handleDelete = async () => {
    try {
      await deletePerson(id);
      localStorage.removeItem("people");
      await fetchPeople();
      navigate("/tables");
    } catch (error) {
      console.error("Failed to delete:", error);
    }
    setShowDeleteModal(false);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleProfilePicUpload = async () => {
    if (!selectedFile) {
      setUploadError("Please select an image file first.");
      return;
    }
    if (isAddMode) {
      setUploadError(
        "Please create the person first before uploading an image."
      );
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    try {
      const response = await uploadProfilePicture(id, selectedFile);
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
    } finally {
      setIsUploading(false);
    }
  };

  if (!isAddMode && !person && !showNotFoundModal) return <div>Loading...</div>;

  // Filter customFields based on the PRESENCE of the 'value2' property
  // AND ensure 'ProfilePic' is not rendered as a custom field value
  const personalInfoCustomFieldsForRender = customFields.filter(
    (field) => !("value2" in field) && field.key !== "ProfilePic"
  );
  const relationshipCustomFieldsForRender = customFields.filter(
    (field) => "value2" in field
  );

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Card>
          {/* Header and Action Buttons */}
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
          {/* Main content area: Two Columns using Grid */}
          <Grid container spacing={3} p={3}>
            {/* Left Column: Profile Picture and Name Only */}
            <Grid item xs={12} md={4} lg={3}>
              <MDBox
                display="flex"
                flexDirection="column"
                alignItems="center"
                height="100%"
                sx={{
                  backgroundColor:
                    isAddMode || isEditing
                      ? "rgba(0, 0, 0, 0.03)"
                      : "transparent",
                  borderRadius: 1,
                  p: isAddMode || isEditing ? 2 : 0,
                  border: isAddMode || isEditing ? "1px dashed #ccc" : "none",
                }}
              >
                {/* Profile Picture Display */}
                <MDBox
                  component="img"
                  src={
                    isAddMode || isEditing
                      ? editedPerson?.ProfilePic || defaultProfilePic
                      : person?.ProfilePic || defaultProfilePic
                  }
                  alt={`${person?.Name || "User"}'s profile`}
                  width="150px"
                  height="150px"
                  borderRadius="50%"
                  sx={{ objectFit: "cover", border: "2px solid #ddd" }}
                />
                {/* Profile Picture Upload Controls (visible in edit/add mode) */}
                {(isEditing || isAddMode) && (
                  <MDBox
                    mt={2}
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    gap={1}
                    width="100%"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                      id="profile-pic-upload-input"
                    />
                    <label
                      htmlFor="profile-pic-upload-input"
                      style={{ width: "100%" }}
                    >
                      <MDButton
                        variant="outlined"
                        color="info"
                        component="span"
                        fullWidth
                        startIcon={<UploadFileIcon />}
                      >
                        {selectedFile
                          ? selectedFile.name
                          : "Choose Profile Picture"}
                      </MDButton>
                    </label>
                    {selectedFile && (
                      <MDButton
                        variant="gradient"
                        color="success"
                        onClick={handleProfilePicUpload}
                        disabled={isUploading || isAddMode}
                        fullWidth
                        sx={{ mt: 1 }}
                      >
                        {isUploading ? (
                          <CircularProgress size={24} color="inherit" />
                        ) : (
                          "Upload Image"
                        )}
                      </MDButton>
                    )}
                    {uploadError && (
                      <MDTypography variant="caption" color="error" mt={1}>
                        {uploadError}
                      </MDTypography>
                    )}
                  </MDBox>
                )}
                {/* Display Name and Chinese Name ONLY in view mode */}
                {!isEditing && !isAddMode && (
                  <>
                    <MDTypography variant="h5" mt={2}>
                      {person?.Name || ""}
                    </MDTypography>
                  </>
                )}
              </MDBox>
            </Grid>
            {/* Right Column: Personal Info & Related Persons Panels */}
            <Grid item xs={12} md={8} lg={9}>
              {/* Panel 1: Personal Information */}
              <Card sx={{ mb: 3, p: 2 }}>
                <MDTypography variant="h6" mb={2}>
                  Personal Information
                </MDTypography>
                {isEditing || isAddMode ? (
                  <MDBox display="flex" flexDirection="column" gap={2}>
                    {/* Core personal info fields */}
                    <TextField
                      variant="outlined"
                      label="Name"
                      value={editedPerson?.Name || ""}
                      onChange={(e) => handleChange("Name", e.target.value)}
                      fullWidth
                      sx={{ "& .MuiOutlinedInput-root": { height: "56px" } }}
                    />
                    <TextField
                      variant="outlined"
                      label="Chinese Name"
                      value={editedPerson?.NameChi || ""}
                      onChange={(e) => handleChange("NameChi", e.target.value)}
                      fullWidth
                      sx={{ "& .MuiOutlinedInput-root": { height: "56px" } }}
                    />
                    <TextField
                      variant="outlined"
                      select
                      label="District"
                      value={editedPerson?.District || ""}
                      onChange={(e) => handleChange("District", e.target.value)}
                      fullWidth
                      SelectProps={{
                        MenuProps: {
                          PaperProps: { style: { maxHeight: 300 } },
                        },
                        sx: {
                          ".MuiSelect-select": {
                            height: "56px",
                            paddingTop: 0,
                            paddingBottom: 0,
                            display: "flex",
                            alignItems: "center",
                          },
                        },
                      }}
                      sx={{
                        "& .MuiOutlinedInput-root": { height: "56px" },
                      }}
                    >
                      {SG_DISTRICTS.map((district) => (
                        <MenuItem key={district} value={district}>
                          {district}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      variant="outlined"
                      label="Address"
                      value={editedPerson?.Address || ""}
                      onChange={(e) => handleChange("Address", e.target.value)}
                      fullWidth
                      sx={{ "& .MuiOutlinedInput-root": { height: "56px" } }}
                    />
                    <TextField
                      variant="outlined"
                      label="Contact"
                      value={editedPerson?.Contact || ""}
                      onChange={(e) => handleChange("Contact", e.target.value)}
                      fullWidth
                      sx={{ "& .MuiOutlinedInput-root": { height: "56px" } }}
                    />
                    {/* Generic custom fields from state (not relationships) */}
                    {personalInfoCustomFieldsForRender.map((field, index) => (
                      <MDBox
                        key={`pcf-${index}`}
                        display="flex"
                        gap={2}
                        alignItems="center"
                      >
                        <Autocomplete
                          freeSolo
                          options={FIELD_NAME_SUGGESTIONS}
                          value={field.key || ""}
                          onChange={(event, newValue) =>
                            updateCustomField(index, "key", newValue || "")
                          }
                          onInputChange={(event, newInputValue) =>
                            updateCustomField(index, "key", newInputValue)
                          }
                          sx={{ flex: 1 }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              variant="outlined"
                              label="Field Name"
                              sx={{
                                "& .MuiOutlinedInput-root": { height: "56px" },
                              }}
                            />
                          )}
                          renderOption={(props, option) => {
                            const [start, match, end] = splitMatch(
                              option,
                              field.key || ""
                            );
                            return (
                              <li {...props}>
                                {match ? (
                                  <>
                                    {start}
                                    <Highlight>{match}</Highlight>
                                    {end}
                                  </>
                                ) : (
                                  option
                                )}
                              </li>
                            );
                          }}
                        />
                        <TextField
                          variant="outlined"
                          label="Value"
                          value={field.value}
                          onChange={(e) =>
                            updateCustomField(index, "value", e.target.value)
                          }
                          sx={{
                            flex: 1,
                            "& .MuiOutlinedInput-root": { height: "56px" },
                          }}
                        />
                        <MDButton
                          variant="outlined"
                          color="error"
                          onClick={() => removeCustomField(index)}
                          sx={{ height: "56px" }}
                        >
                          Remove
                        </MDButton>
                      </MDBox>
                    ))}
                    <MDButton
                      variant="outlined"
                      color="info"
                      onClick={addCustomField}
                      sx={{ mt: 1, height: "56px" }}
                      startIcon={<AddIcon />}
                    >
                      Add Other Custom Field
                    </MDButton>
                  </MDBox>
                ) : (
                  <MDBox display="flex" flexDirection="column" gap={1}>
                    {/* View mode for Personal Info */}
                    {/* Explicitly render core fields */}
                    {person?.Name && (
                      <MDTypography variant="body2">
                        <MDTypography component="span" fontWeight="bold">
                          Name:
                        </MDTypography>{" "}
                        {person.Name}
                      </MDTypography>
                    )}
                    {person?.NameChi && (
                      <MDTypography variant="body2">
                        <MDTypography component="span" fontWeight="bold">
                          Chinese Name:
                        </MDTypography>{" "}
                        {person.NameChi}
                      </MDTypography>
                    )}
                    {person?.District && (
                      <MDTypography variant="body2">
                        <MDTypography component="span" fontWeight="bold">
                          District:
                        </MDTypography>{" "}
                        {person.District}
                      </MDTypography>
                    )}
                    {person?.Address && (
                      <MDTypography variant="body2">
                        <MDTypography component="span" fontWeight="bold">
                          Address:
                        </MDTypography>{" "}
                        {person.Address}
                      </MDTypography>
                    )}
                    {person?.Contact && (
                      <MDTypography variant="body2">
                        <MDTypography component="span" fontWeight="bold">
                          Contact:
                        </MDTypography>{" "}
                        {person.Contact}
                      </MDTypography>
                    )}
                    {/* Render generic custom fields, filtered to exclude ProfilePic */}
                    {personalInfoCustomFieldsForRender.map((field, index) => (
                      <MDTypography key={`pcf-view-${index}`} variant="body2">
                        <MDTypography component="span" fontWeight="bold">
                          {field.key}:
                        </MDTypography>{" "}
                        {typeof field.value === "object"
                          ? JSON.stringify(field.value)
                          : field.value}
                      </MDTypography>
                    ))}
                    {/* Only show "No additional info" if NO standard fields AND NO custom fields are present */}
                    {!person?.Name &&
                      !person?.NameChi &&
                      !person?.District &&
                      !person?.Address &&
                      !person?.Contact &&
                      personalInfoCustomFieldsForRender.length === 0 && (
                        <MDTypography variant="body2" color="text">
                          No additional personal information.
                        </MDTypography>
                      )}
                  </MDBox>
                )}
              </Card>
              {/* Panel 2: Related Persons */}
              <Card sx={{ p: 2 }}>
                <MDTypography variant="h6" mb={2}>
                  Related Persons
                </MDTypography>
                {isEditing || isAddMode ? (
                  <MDBox display="flex" flexDirection="column" gap={2}>
                    {relationshipCustomFieldsForRender.map((field, index) => (
                      <MDBox
                        key={`rcf-${index}`}
                        display="flex"
                        gap={2}
                        alignItems="center"
                      >
                        <Autocomplete
                          freeSolo
                          options={personNameOptions}
                          value={field.value || ""}
                          onChange={(event, newValue) =>
                            updateCustomField(index, "value", newValue || "")
                          }
                          onInputChange={(event, newInputValue) =>
                            updateCustomField(index, "value", newInputValue)
                          }
                          sx={{ flex: 1.5 }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              variant="outlined"
                              label="Person's Name"
                              sx={{
                                "& .MuiOutlinedInput-root": { height: "56px" },
                              }}
                            />
                          )}
                        />
                        <Autocomplete
                          freeSolo
                          options={RELATION_SUGGESTIONS}
                          value={field.value2 || ""}
                          onChange={(event, newValue) =>
                            updateCustomField(index, "value2", newValue || "")
                          }
                          onInputChange={(event, newInputValue) =>
                            updateCustomField(index, "value2", newInputValue)
                          }
                          sx={{ flex: 1 }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              variant="outlined"
                              label="Relation Type"
                              sx={{
                                "& .MuiOutlinedInput-root": { height: "56px" },
                              }}
                            />
                          )}
                        />
                        <MDButton
                          variant="outlined"
                          color="error"
                          onClick={() => removeCustomField(index)}
                          sx={{ height: "56px" }}
                        >
                          Remove
                        </MDButton>
                      </MDBox>
                    ))}
                    <MDButton
                      variant="outlined"
                      color="info"
                      onClick={addRelationshipField}
                      sx={{ mt: 1, height: "56px" }}
                      startIcon={<AddIcon />}
                    >
                      Add Relationship
                    </MDButton>
                  </MDBox>
                ) : (
                  <MDBox display="flex" flexWrap="wrap" gap={2}>
                    {/* Display related persons in view mode */}
                    {relationshipCustomFieldsForRender.map((field, index) => {
                      const relatedPersonName = field.value;
                      const relatedPersonRelation = field.value2;
                      const relatedPerson = peopleList.find(
                        (p) => p.Name === relatedPersonName
                      );
                      const relatedPersonProfilePic =
                        relatedPerson?.ProfilePic || defaultProfilePic;
                      return (
                        <MDBox
                          key={`rcf-view-${index}`}
                          display="flex"
                          flexDirection="column"
                          alignItems="center"
                          textAlign="center"
                          width="80px"
                        >
                          <MDBox
                            component="img"
                            src={relatedPersonProfilePic}
                            alt={`${relatedPersonName}'s profile`}
                            width="60px"
                            height="60px"
                            borderRadius="50%"
                            sx={{ objectFit: "cover", mb: 0.5 }}
                          />
                          <MDTypography
                            variant="caption"
                            fontWeight="medium"
                            lineHeight={1.2}
                          >
                            {relatedPersonName}
                          </MDTypography>
                          <MDTypography
                            variant="caption"
                            color="text"
                            lineHeight={1.2}
                          >
                            {relatedPersonRelation}
                          </MDTypography>
                        </MDBox>
                      );
                    })}
                    {relationshipCustomFieldsForRender.length === 0 && (
                      <MDTypography variant="body2" color="text">
                        No related persons found.
                      </MDTypography>
                    )}
                  </MDBox>
                )}
              </Card>
            </Grid>
          </Grid>
        </Card>
      </MDBox>
      {/* Dialogs (remain unchanged) */}
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
