import React from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { useNavigate } from "react-router-dom";

function PersonDisplay({
  person,
  personalInfoCustomFieldsForRender,
  relationshipCustomFieldsForRender,
  peopleList, // Used for looking up related person's profile pic
  defaultProfilePic,
}) {
  const navigate = useNavigate();
  const handleRelatedPersonClick = (relatedPerson) => {
    if (!relatedPerson?._id) return;
    navigate(`/person/${relatedPerson._id}`);
  };

  return (
    <Grid container spacing={3}>
      {/* Left Column: Profile Picture and Name Only */}
      <Grid item xs={12} md={4} lg={3}>
        <MDBox
          display="flex"
          flexDirection="column"
          alignItems="center"
          height="100%"
          sx={{
            backgroundColor: "transparent",
            borderRadius: 1,
            p: 0,
            border: "none",
          }}
        >
          {/* Profile Picture Display */}
          <MDBox
            component="img"
            src={person?.ProfilePic || defaultProfilePic}
            alt={`${person?.Name || "User"}'s profile`}
            width="150px"
            height="150px"
            borderRadius="50%"
            sx={{ objectFit: "cover", border: "2px solid #ddd" }}
          />
          {/* Display Name */}
          <MDTypography variant="h5" mt={2}>
            {person?.Name || ""}
          </MDTypography>
        </MDBox>
      </Grid>

      {/* Right Column: Read-only Personal Info & Related Persons Panels */}
      <Grid item xs={12} md={8} lg={9}>
        {/* Panel 1: Personal Information */}
        <Card sx={{ mb: 3, p: 2 }}>
          <MDTypography variant="h6" mb={2}>
            Personal Information
          </MDTypography>
          <MDBox display="flex" flexDirection="column" gap={1}>
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
        </Card>
        {/* Panel 2: Related Persons */}
        <Card sx={{ p: 2 }}>
          <MDTypography variant="h6" mb={2}>
            Related Persons
          </MDTypography>
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
                  role="button"
                  tabIndex={0}
                  onClick={() => handleRelatedPersonClick(relatedPerson)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleRelatedPersonClick(relatedPerson);
                    }
                  }}
                  sx={{
                    cursor: "pointer",
                    outline: "none",
                  }}
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
                  <MDTypography variant="caption" color="text" lineHeight={1.2}>
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
        </Card>
      </Grid>
    </Grid>
  );
}

export default PersonDisplay;
