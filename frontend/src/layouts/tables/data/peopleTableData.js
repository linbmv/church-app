import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDAvatar from "components/MDAvatar";
import MDBadge from "components/MDBadge";
import Checkbox from "@mui/material/Checkbox";
import { useState, useEffect } from "react";
import team2 from "assets/images/team-2.jpg";
import { fetchPeople } from "services/convo-broker.js";
import { useNavigate } from "react-router-dom";

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

  const People = ({ id, image, name, district }) => (
    <MDBox
      display="flex"
      alignItems="center"
      lineHeight={1}
      onClick={() => navigate(`/person/${id}`)}
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

  const Job = ({ title, description }) => (
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

  return {
    columns: [
      { Header: "name", accessor: "people", width: "35%", align: "left" },
      { Header: "address", accessor: "address", align: "left" },
      { Header: "status", accessor: "status", align: "center" },
      { Header: "mobile", accessor: "mobile", align: "center" },
      { Header: "", accessor: "action", align: "center" },
    ],
    rows: people.map((person) => ({
      people: (
        <People
          image={team2}
          name={person.Name || "N/A"}
          district={person.District || ""}
          id={person._id}
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
    })),
  };
}
