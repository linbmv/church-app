// layouts/tables/data/peopleTableData.js
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDAvatar from "components/MDAvatar";
import MDBadge from "components/MDBadge";
// import Checkbox from "@mui/material/Checkbox";
import { useState, useEffect } from "react";
import defaultProfilePic from "assets/images/default-profile-picture.png";
import { fetchPeople } from "services/convo-broker.js";
import { useNavigate } from "react-router-dom";

export const columns = [
  { Header: "name", accessor: "people", width: "35%", align: "left" },
  { Header: "address", accessor: "address", align: "left" },
  { Header: "status", accessor: "status", align: "center" },
  { Header: "mobile", accessor: "mobile", align: "center" },
  { Header: "", accessor: "action", align: "center" },
];

function People({ id, image, name, district, onClick }) {
  return (
    <MDBox
      display="flex"
      alignItems="center"
      lineHeight={1}
      onClick={onClick}
      sx={{ cursor: "pointer" }}
    >
      {/* <Checkbox color="primary" /> */}
      <MDAvatar src={image} name={name} size="sm" />
      <MDBox ml={2} lineHeight={1}>
        <MDTypography display="block" variant="button" fontWeight="medium">
          {name}
        </MDTypography>
        <MDTypography variant="caption">{district}</MDTypography>
      </MDBox>
    </MDBox>
  );
}

function Job({ title, description }) {
  return (
    <MDBox lineHeight={1} textAlign="left">
      <MDTypography
        display="block"
        variant="caption"
        color="text"
        fontWeight="medium"
      >
        {title}
      </MDTypography>
      <MDTypography variant="caption">{description}</MDTypography>
    </MDBox>
  );
}

// Build rows from a raw people array
export function buildRows(rawPeople, navigate) {
  return rawPeople.map((person) => ({
    people: (
      <People
        image={person.ProfilePic || defaultProfilePic}
        name={person.Name || "N/A"}
        district={person.District || ""}
        id={person._id}
        onClick={() => navigate(`/person/${person._id}`)}
      />
    ),
    address: <Job title={person.Address || ""} description="" />,
    status: (
      <MDBox ml={-1}>
        <MDBadge
          badgeContent="baptised"
          color="success"
          variant="gradient"
          size="sm"
        />
      </MDBox>
    ),
    mobile: (
      <MDTypography
        component="a"
        href="#"
        variant="caption"
        color="text"
        fontWeight="medium"
      >
        {person.Contact || "N/A"}
      </MDTypography>
    ),
    action: (
      <MDTypography
        component="a"
        onClick={() =>
          navigate(`/person/${person._id}`, { state: { edit: true } })
        }
        variant="caption"
        color="text"
        fontWeight="medium"
        sx={{ cursor: "pointer" }}
      >
        Edit
      </MDTypography>
    ),
  }));
}

export default function data() {
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);

  useEffect(() => {
    const loadPeople = async () => {
      await fetchPeople();
      const stored = localStorage.getItem("people");
      if (stored) {
        setPeople(JSON.parse(stored));
      }
    };
    loadPeople();
  }, []);

  return {
    columns,
    people, // expose raw people
    rows: buildRows(people, navigate),
  };
}
