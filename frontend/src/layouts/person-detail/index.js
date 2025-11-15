import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Card from "@mui/material/Card";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import MenuItem from "@mui/material/MenuItem";
import {
  updatePerson,
  fetchPeople,
  createPerson,
  deletePerson,
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

function PersonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isAddMode = id === "add";
  const [person, setPerson] = useState(null);
  const [isEditing, setIsEditing] = useState(location.state?.edit || isAddMode);
  const [editedPerson, setEditedPerson] = useState(isAddMode ? {} : null);
  const [customFields, setCustomFields] = useState([]);
  const [showNotFoundModal, setShowNotFoundModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!isAddMode) {
      const stored = localStorage.getItem("people");
      if (stored) {
        const people = JSON.parse(stored);
        const found = people.find((p) => p._id === id);
        if (found) {
          setPerson(found);
          setEditedPerson(found);
        } else {
          setShowNotFoundModal(true);
        }
      }
    }
  }, [id, isAddMode]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const dataToSave = { ...editedPerson };
      customFields.forEach((field) => {
        if (field.key) dataToSave[field.key] = field.value;
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
        }
        setIsEditing(false);
      }
      setCustomFields([]);
    } catch (error) {
      console.error("Failed to save:", error);
    }
  };

  const handleDiscard = () => {
    if (isAddMode) {
      navigate("/tables");
    } else {
      setEditedPerson(person);
      setIsEditing(false);
      setCustomFields([]);
    }
  };

  const handleChange = (field, value) => {
    setEditedPerson({ ...editedPerson, [field]: value });
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { key: "", value: "" }]);
  };

  const updateCustomField = (index, field, value) => {
    const updated = [...customFields];
    updated[index][field] = value;
    setCustomFields(updated);
  };

  const removeCustomField = (index) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const removeExistingField = (key) => {
    const updated = { ...editedPerson };
    delete updated[key];
    setEditedPerson(updated);
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

  const knownFields = [
    "_id",
    "id",
    "Name",
    "NameChi",
    "District",
    "Address",
    "Contact",
  ];
  const extraFields = person
    ? Object.keys(person).filter((key) => !knownFields.includes(key))
    : [];

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Card>
          <MDBox p={3}>
            <MDBox
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <MDTypography variant="h4">
                {isAddMode
                  ? "Add Person"
                  : isEditing
                  ? "Edit Person"
                  : `${person?.Name || ""}${
                      person?.NameChi ? ", " + person.NameChi : ""
                    }`}
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
            {isEditing || isAddMode ? (
              <MDBox display="flex" flexDirection="column" gap={2}>
                <TextField
                  label="Name"
                  value={editedPerson?.Name || ""}
                  onChange={(e) => handleChange("Name", e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Chinese Name"
                  value={editedPerson?.NameChi || ""}
                  onChange={(e) => handleChange("NameChi", e.target.value)}
                  fullWidth
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
                      PaperProps: {
                        style: {
                          maxHeight: 300,
                        },
                      },
                    },
                  }}
                  sx={{
                    // make the outer input match your other fields
                    "& .MuiOutlinedInput-root": {
                      height: 44.13,
                    },
                    // align the select text vertically like the others
                    "& .MuiSelect-select": {
                      display: "flex",
                      alignItems: "center",
                      paddingTop: "16.5px",
                      paddingBottom: "16.5px",
                    },
                  }}
                >
                  {SG_DISTRICTS.map((district) => (
                    <MenuItem key={district} value={district}>
                      {district}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Address"
                  value={editedPerson?.Address || ""}
                  onChange={(e) => handleChange("Address", e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Contact"
                  value={editedPerson?.Contact || ""}
                  onChange={(e) => handleChange("Contact", e.target.value)}
                  fullWidth
                />
                {extraFields.map((key) => (
                  <MDBox key={key} display="flex" gap={2}>
                    <TextField
                      label={key}
                      value={editedPerson?.[key] || ""}
                      onChange={(e) => handleChange(key, e.target.value)}
                      fullWidth
                    />
                    <MDButton
                      variant="outlined"
                      color="error"
                      onClick={() => removeExistingField(key)}
                    >
                      Remove
                    </MDButton>
                  </MDBox>
                ))}
                {customFields.map((field, index) => (
                  <MDBox key={index} display="flex" gap={2}>
                    <TextField
                      label="Field Name"
                      value={field.key}
                      onChange={(e) =>
                        updateCustomField(index, "key", e.target.value)
                      }
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Value"
                      value={field.value}
                      onChange={(e) =>
                        updateCustomField(index, "value", e.target.value)
                      }
                      sx={{ flex: 1 }}
                    />
                    <MDButton
                      variant="outlined"
                      color="error"
                      onClick={() => removeCustomField(index)}
                    >
                      Remove
                    </MDButton>
                  </MDBox>
                ))}
                <MDButton
                  variant="outlined"
                  color="info"
                  onClick={addCustomField}
                >
                  Add Custom Field
                </MDButton>
              </MDBox>
            ) : (
              <>
                <MDTypography variant="body2">
                  District: {person?.District}
                </MDTypography>
                <MDTypography variant="body2">
                  Address: {person?.Address}
                </MDTypography>
                <MDTypography variant="body2">
                  Contact: {person?.Contact}
                </MDTypography>
                {extraFields.map((key) => (
                  <MDTypography key={key} variant="body2">
                    {key}: {person[key]}
                  </MDTypography>
                ))}
              </>
            )}
          </MDBox>
        </Card>
      </MDBox>
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
