import React from "react";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";
import Grid from "@mui/material/Grid";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Card from "@mui/material/Card";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import {
  SG_DISTRICTS,
  FIELD_NAME_SUGGESTIONS,
  RELATION_SUGGESTIONS,
  RELATION_AUTO_RECIPROCALS,
  RELATION_RECIPROCAL_SUGGESTIONS,
} from "../../constants";
import { Highlight, splitMatch } from "../../utils/stringUtils";

function PersonEditForm({
  editedPerson,
  personalInfoCustomFieldsForRender,
  relationshipCustomFieldsForRender,
  relationshipFieldErrors = {},
  peopleList, // Used for personNameOptions
  defaultProfilePic,
  isAddMode,
  // Handlers passed from parent
  handleChange,
  addCustomField,
  addRelationshipField,
  updateCustomField,
  removeCustomField,
  handleFileChange,
  handleProfilePicUpload,
  // Upload states passed from parent
  selectedFile,
  isUploading,
  uploadError,
}) {
  const findPersonById = (id) =>
    peopleList.find((person) => person._id === id) || null;
  const normalizeRelation = (relation = "") => relation.trim().toLowerCase();
  const getAutoReciprocalValue = (relation = "") =>
    RELATION_AUTO_RECIPROCALS[normalizeRelation(relation)] || "";
  const getReciprocalOptions = (relation = "") =>
    RELATION_RECIPROCAL_SUGGESTIONS[normalizeRelation(relation)] ||
    RELATION_SUGGESTIONS;
  const isValidRelationSuggestion = (relation = "") => {
    const trimmed = relation.trim();
    if (!trimmed) return false;
    return RELATION_SUGGESTIONS.some(
      (suggestion) => suggestion.toLowerCase() === trimmed.toLowerCase()
    );
  };

  return (
    <Grid container spacing={3}>
      {/* Left Column: Profile Picture and Upload Controls */}
      <Grid item xs={12} md={4} lg={3}>
        <MDBox
          display="flex"
          flexDirection="column"
          alignItems="center"
          height="100%"
          sx={{
            backgroundColor: "rgba(0, 0, 0, 0.03)",
            borderRadius: 1,
            p: 2,
            border: "1px dashed #ccc",
          }}
        >
          {/* Profile Picture Display */}
          <MDBox
            component="img"
            src={editedPerson?.ProfilePic || defaultProfilePic}
            alt={`${editedPerson?.Name || "User"}'s profile`}
            width="150px"
            height="150px"
            borderRadius="50%"
            sx={{ objectFit: "cover", border: "2px solid #ddd" }}
          />
          {/* Profile Picture Upload Controls */}
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
            <label htmlFor="profile-pic-upload-input" style={{ width: "100%" }}>
              <MDButton
                variant="outlined"
                color="info"
                component="span"
                fullWidth
                startIcon={<UploadFileIcon />}
              >
                {selectedFile ? selectedFile.name : "Choose Profile Picture"}
              </MDButton>
            </label>
            {selectedFile && (
              <MDButton
                variant="gradient"
                color="success"
                onClick={handleProfilePicUpload}
                disabled={isUploading || isAddMode} // Cannot upload image in Add mode until person is created
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
        </MDBox>
      </Grid>

      {/* Right Column: Editable Personal Info & Related Persons Panels */}
      <Grid item xs={12} md={8} lg={9}>
        {/* Panel 1: Personal Information */}
        <Card sx={{ mb: 3, p: 2 }}>
          <MDTypography variant="h6" mb={2}>
            Personal Information
          </MDTypography>
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
            {/* Generic custom fields */}
            {personalInfoCustomFieldsForRender.map((field, index) => {
              const fieldIndex =
                typeof field.originalIndex === "number"
                  ? field.originalIndex
                  : index;
              return (
                <MDBox
                  key={`pcf-${fieldIndex}`}
                  display="flex"
                  gap={2}
                  alignItems="center"
                >
                  <Autocomplete
                    freeSolo
                    options={FIELD_NAME_SUGGESTIONS}
                    value={field.key || ""}
                    onChange={(event, newValue) =>
                      updateCustomField(fieldIndex, "key", newValue || "")
                    }
                    onInputChange={(event, newInputValue) =>
                      updateCustomField(fieldIndex, "key", newInputValue)
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
                      updateCustomField(fieldIndex, "value", e.target.value)
                    }
                    sx={{
                      flex: 1,
                      "& .MuiOutlinedInput-root": { height: "56px" },
                    }}
                  />
                  <MDButton
                    variant="outlined"
                    color="error"
                    onClick={() => removeCustomField(fieldIndex)}
                    sx={{ height: "56px" }}
                  >
                    Remove
                  </MDButton>
                </MDBox>
              );
            })}
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
        </Card>
        {/* Panel 2: Related Persons */}
        <Card sx={{ p: 2 }}>
          <MDTypography variant="h6" mb={2}>
            Related Persons
          </MDTypography>
          <MDBox display="flex" flexDirection="column" gap={2}>
            {relationshipCustomFieldsForRender.map((field, index) => {
              const fieldIndex =
                typeof field.originalIndex === "number"
                  ? field.originalIndex
                  : index;
              const selectedPerson = field.personId
                ? findPersonById(field.personId)
                : null;
              const fieldError = relationshipFieldErrors[fieldIndex] || {};
              const relationInput = field.value2 || "";
              const relationHasValue = Boolean(relationInput.trim());
              const relationIsValid = isValidRelationSuggestion(relationInput);
              const autoReciprocalValue = relationIsValid
                ? getAutoReciprocalValue(relationInput)
                : "";
              const reciprocalOptions = relationIsValid
                ? getReciprocalOptions(relationInput)
                : [];
              const showReciprocalField = relationIsValid;
              const relationErrorMessage =
                fieldError.relationType ||
                (relationHasValue && !relationIsValid
                  ? "Please select a relation from the list."
                  : "");
              const reciprocalErrorMessage = fieldError.reciprocal || "";
              return (
                <MDBox
                  key={`rcf-${fieldIndex}`}
                  display="flex"
                  gap={2}
                  alignItems="center"
                >
                  <Autocomplete
                    freeSolo
                    options={peopleList}
                    getOptionLabel={(option) =>
                      option?.Name || option?.value || ""
                    }
                    value={selectedPerson}
                    inputValue={field.value || ""}
                    isOptionEqualToValue={(option, value) =>
                      option?._id && value?._id
                        ? option._id === value._id
                        : option?.Name === value?.Name
                    }
                    onChange={(event, newValue) => {
                      if (typeof newValue === "string") {
                        updateCustomField(fieldIndex, "value", newValue);
                        updateCustomField(fieldIndex, "personId", "");
                      } else if (newValue && typeof newValue === "object") {
                        updateCustomField(
                          fieldIndex,
                          "value",
                          newValue.Name || ""
                        );
                        updateCustomField(
                          fieldIndex,
                          "personId",
                          newValue._id || ""
                        );
                      } else {
                        updateCustomField(fieldIndex, "value", "");
                        updateCustomField(fieldIndex, "personId", "");
                      }
                    }}
                    onInputChange={(event, newInputValue, reason) => {
                      if (reason === "input") {
                        updateCustomField(fieldIndex, "value", newInputValue);
                        updateCustomField(fieldIndex, "personId", "");
                      }
                    }}
                    renderOption={(props, option, { index }) => (
                      <li
                        {...props}
                        key={`${
                          option?._id || option?.Name || "option"
                        }-${index}`}
                      >
                        {option?.Name || ""}
                      </li>
                    )}
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
                  <MDBox
                    display="flex"
                    flexDirection="column"
                    flex={1}
                    gap={0.5}
                  >
                    {relationErrorMessage && (
                      <MDTypography variant="caption" color="error">
                        {relationErrorMessage}
                      </MDTypography>
                    )}
                    <Autocomplete
                      freeSolo
                      options={RELATION_SUGGESTIONS}
                      value={field.value2 || ""}
                      onChange={(event, newValue) => {
                        const updatedValue = newValue || "";
                        updateCustomField(fieldIndex, "value2", updatedValue);
                        if (isValidRelationSuggestion(updatedValue)) {
                          const autoValue =
                            getAutoReciprocalValue(updatedValue);
                          updateCustomField(
                            fieldIndex,
                            "value3",
                            autoValue || ""
                          );
                        } else {
                          updateCustomField(fieldIndex, "value3", "");
                        }
                      }}
                      onInputChange={(event, newInputValue) => {
                        updateCustomField(fieldIndex, "value2", newInputValue);
                        if (isValidRelationSuggestion(newInputValue)) {
                          const autoValue =
                            getAutoReciprocalValue(newInputValue);
                          updateCustomField(
                            fieldIndex,
                            "value3",
                            autoValue || ""
                          );
                        } else {
                          updateCustomField(fieldIndex, "value3", "");
                        }
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          variant="outlined"
                          label="Their Relation to Me"
                          error={Boolean(relationErrorMessage)}
                          sx={{
                            "& .MuiOutlinedInput-root": { height: "56px" },
                          }}
                        />
                      )}
                    />
                  </MDBox>
                  {showReciprocalField &&
                    (autoReciprocalValue ? (
                      <TextField
                        variant="outlined"
                        label="My Relation to Them"
                        value={autoReciprocalValue}
                        disabled
                        sx={{
                          flex: 1,
                          "& .MuiOutlinedInput-root": { height: "56px" },
                        }}
                      />
                    ) : (
                      <MDBox
                        display="flex"
                        flexDirection="column"
                        flex={1}
                        gap={0.5}
                      >
                        {reciprocalErrorMessage && (
                          <MDTypography variant="caption" color="error">
                            {reciprocalErrorMessage}
                          </MDTypography>
                        )}
                        <Autocomplete
                          freeSolo
                          options={reciprocalOptions}
                          value={field.value3 || ""}
                          onChange={(event, newValue) =>
                            updateCustomField(
                              fieldIndex,
                              "value3",
                              newValue || ""
                            )
                          }
                          onInputChange={(event, newInputValue) =>
                            updateCustomField(
                              fieldIndex,
                              "value3",
                              newInputValue
                            )
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              variant="outlined"
                              label="My Relation to Them"
                              error={Boolean(reciprocalErrorMessage)}
                              sx={{
                                "& .MuiOutlinedInput-root": { height: "56px" },
                              }}
                            />
                          )}
                        />
                      </MDBox>
                    ))}
                  <MDButton
                    variant="outlined"
                    color="error"
                    onClick={() => removeCustomField(fieldIndex)}
                    sx={{ height: "56px" }}
                  >
                    Remove
                  </MDButton>
                </MDBox>
              );
            })}
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
        </Card>
      </Grid>
    </Grid>
  );
}

export default PersonEditForm;
