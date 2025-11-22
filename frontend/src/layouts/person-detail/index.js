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
} from "services/convo-broker.js";

// Cloudinary
import cld from "services/cloudinary/cloudinary";
import { AdvancedImage } from "@cloudinary/react";
import { fill } from "@cloudinary/url-gen/actions/resize";
// Instantiate a CloudinaryImage object for the image with the public ID, 'docs/models'.
const myImage = cld.image("images_mbi0cg");
{
  /* <AdvancedImage cldImg={myImage} />; */
}

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

const DEFAULT_PROFILE_PIC_URL = "/team-2.jpg";

function PersonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isAddMode = id === "add";

  const [person, setPerson] = useState(null);
  const [isEditing, setIsEditing] = useState(location.state?.edit || isAddMode);
  const [editedPerson, setEditedPerson] = useState(
    isAddMode ? { profilePic: "" } : null
  );
  // `customFields` will now contain objects either with or without a `value2` property
  const [customFields, setCustomFields] = useState([]);
  const [showNotFoundModal, setShowNotFoundModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [peopleList, setPeopleList] = useState([]);

  const knownFields = [
    "_id",
    "id",
    "Name",
    "NameChi",
    "District",
    "Address",
    "Contact",
    "profilePic",
  ];

  // Helper to check if a field's value represents a relationship object
  const isRelationshipFieldData = (fieldData) => {
    return (
      fieldData &&
      typeof fieldData === "object" &&
      "person" in fieldData &&
      "relation" in fieldData
    );
  };

  // Helper function to initialize custom fields from person data
  const initializeCustomFields = (personData) => {
    const initialCustomFields = [];
    Object.keys(personData || {}).forEach((key) => {
      if (!knownFields.includes(key)) {
        if (isRelationshipFieldData(personData[key])) {
          initialCustomFields.push({
            key: key,
            value: personData[key].person || "",
            value2: personData[key].relation || "", // Relationship fields have value2
          });
        } else {
          initialCustomFields.push({
            key: key,
            value: personData[key] || "",
            // Non-relationship fields do NOT have value2
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
          setCustomFields(initializeCustomFields(found)); // Use helper
        } else {
          setShowNotFoundModal(true);
        }
      }
    } else {
      setEditedPerson({
        profilePic: "",
        Name: "",
        NameChi: "",
        District: "",
        Address: "",
        Contact: "",
      });
      setCustomFields([]); // Ensure custom fields are empty for new person
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
      const existingDynamicKeys = Object.keys(person || {}).filter(
        (key) => !knownFields.includes(key)
      );
      existingDynamicKeys.forEach((key) => delete dataToSave[key]);

      customFields.forEach((field, index) => {
        let actualKey = field.key;
        if (!actualKey) {
          actualKey = `CustomField_${index}`;
        }
        // Check for the PRESENCE of 'value2' to determine if it's a relationship
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
          setCustomFields(initializeCustomFields(found)); // Use helper
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
      setCustomFields(initializeCustomFields(person)); // Use helper
      setIsEditing(false);
    }
  };

  const handleChange = (field, value) => {
    setEditedPerson({ ...editedPerson, [field]: value });
  };

  const addCustomField = () => {
    // Add a generic custom field WITHOUT a value2 property
    setCustomFields([...customFields, { key: "", value: "" }]);
  };

  const addRelationshipField = () => {
    const newRelationshipKey = `Relationship_${Date.now()}_${
      customFields.length
    }`;
    // Add a relationship field WITH a value2 property (even if empty initially)
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

  if (!isAddMode && !person && !showNotFoundModal) return <div>Loading...</div>;

  // Filter customFields based on the PRESENCE of the 'value2' property
  const personalInfoCustomFieldsForRender = customFields.filter(
    (field) => !("value2" in field) // Field does NOT have 'value2'
  );
  const relationshipCustomFieldsForRender = customFields.filter(
    (field) => "value2" in field // Field HAS 'value2'
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
                <MDBox
                  component="img"
                  src={
                    isAddMode || isEditing
                      ? editedPerson?.profilePic || DEFAULT_PROFILE_PIC_URL
                      : person?.profilePic || DEFAULT_PROFILE_PIC_URL
                  }
                  alt={`${person?.Name || "User"}'s profile`}
                  width="150px"
                  height="150px"
                  borderRadius="50%"
                  sx={{ objectFit: "cover", border: "2px solid #ddd" }}
                />
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
                    {/* District TextField - Adjusted height */}
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
                    {!person?.Name &&
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
                        relatedPerson?.profilePic || DEFAULT_PROFILE_PIC_URL;
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
