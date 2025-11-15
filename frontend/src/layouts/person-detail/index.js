import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Card from "@mui/material/Card";
import TextField from "@mui/material/TextField";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import { updatePerson, fetchPeople } from "services/convo-broker.js";

function PersonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [person, setPerson] = useState(null);
  const [isEditing, setIsEditing] = useState(location.state?.edit || false);
  const [editedPerson, setEditedPerson] = useState(null);
  const [customFields, setCustomFields] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem("people");
    if (stored) {
      const people = JSON.parse(stored);
      const found = people.find((p) => p._id === id);
      setPerson(found);
      setEditedPerson(found);
    }
  }, [id]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const dataToSave = { ...editedPerson };
      customFields.forEach((field) => {
        if (field.key) dataToSave[field.key] = field.value;
      });
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
      setCustomFields([]);
    } catch (error) {
      console.error("Failed to save:", error);
    }
  };

  const handleDiscard = () => {
    setEditedPerson(person);
    setIsEditing(false);
    setCustomFields([]);
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

  if (!person) return <div>Loading...</div>;

  const knownFields = [
    "_id",
    "id",
    "Name",
    "NameChi",
    "District",
    "Address",
    "Contact",
  ];
  const extraFields = Object.keys(person).filter(
    (key) => !knownFields.includes(key)
  );

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
                {isEditing
                  ? "Edit Person"
                  : `${person.Name}${
                      person.NameChi ? ", " + person.NameChi : ""
                    }`}
              </MDTypography>
              <MDBox display="flex" gap={1}>
                {isEditing ? (
                  <>
                    <MDButton
                      variant="gradient"
                      color="info"
                      onClick={handleSave}
                    >
                      Save
                    </MDButton>
                    <MDButton
                      variant="outlined"
                      color="secondary"
                      onClick={handleDiscard}
                    >
                      Discard
                    </MDButton>
                  </>
                ) : (
                  <MDButton
                    variant="gradient"
                    color="info"
                    onClick={handleEdit}
                  >
                    Edit
                  </MDButton>
                )}
              </MDBox>
            </MDBox>
            {isEditing ? (
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
                  label="District"
                  value={editedPerson?.District || ""}
                  onChange={(e) => handleChange("District", e.target.value)}
                  fullWidth
                />
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
                  <TextField
                    key={key}
                    label={key}
                    value={editedPerson?.[key] || ""}
                    onChange={(e) => handleChange(key, e.target.value)}
                    fullWidth
                  />
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
                  District: {person.District}
                </MDTypography>
                <MDTypography variant="body2">
                  Address: {person.Address}
                </MDTypography>
                <MDTypography variant="body2">
                  Contact: {person.Contact}
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
    </DashboardLayout>
  );
}

export default PersonDetail;
