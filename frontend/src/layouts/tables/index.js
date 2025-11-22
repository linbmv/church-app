// layouts/tables/index.js
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";
import peopleTableData, {
  columns as peopleColumns,
  buildRows as buildPeopleRows,
} from "layouts/tables/data/peopleTableData";
import projectsTableData from "layouts/tables/data/projectsTableData";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

function Tables() {
  const { people, rows: initialRows } = peopleTableData(); // now also returns people
  const { columns: pColumns, rows: pRows } = projectsTableData();
  const navigate = useNavigate();

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [inputValue, setInputValue] = useState("1");
  const rowsPerPage = 5;

  // Filter people by name substring
  const filteredPeople = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => (p?.Name || "").toLowerCase().includes(q));
  }, [people, searchQuery]);

  // Rebuild rows from filtered people
  const rows = useMemo(
    () => buildPeopleRows(filteredPeople, navigate),
    [filteredPeople, navigate]
  );

  // Pagination derived from filtered rows
  const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const paginatedRows = rows.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  // Reset to page 1 when search changes or filtered size shrinks below current page
  useEffect(() => {
    setPage(1);
    setInputValue("1");
  }, [searchQuery]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
      setInputValue(totalPages.toString());
    }
  }, [page, totalPages]);

  // Page input handlers
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };
  const handleInputBlur = () => {
    const value = parseInt(inputValue, 10);
    if (Number.isNaN(value)) {
      setInputValue(page.toString());
      return;
    }
    if (value >= 1 && value <= totalPages) {
      setPage(value);
    } else if (value > totalPages) {
      setPage(totalPages);
      setInputValue(totalPages.toString());
    } else {
      setInputValue(page.toString());
    }
  };
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleInputBlur();
    }
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Grid container spacing={6}>
          <Grid item xs={12}>
            <Card>
              <MDBox
                mx={2}
                mt={-3}
                py={3}
                px={2}
                variant="gradient"
                bgColor="info"
                borderRadius="lg"
                coloredShadow="info"
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <MDTypography variant="h6" color="white">
                  Brothers & Sisters
                </MDTypography>
                <MDButton
                  variant="contained"
                  color="white"
                  onClick={() =>
                    navigate("/person/add", { state: { add: true } })
                  }
                >
                  Add
                </MDButton>
              </MDBox>

              <MDBox pt={3} sx={{ maxHeight: 400, overflow: "auto" }}>
                <DataTable
                  table={{ columns: peopleColumns, rows: paginatedRows }}
                  isSorted={false}
                  entriesPerPage={false}
                  showTotalEntries={false}
                  noEndBorder
                />
              </MDBox>

              {/* Row with search (left) and pagination (right) */}
              <MDBox
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                p={2}
                gap={2}
              >
                {/* Search on the far left */}
                <TextField
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="small"
                  sx={{ minWidth: 240 }}
                />

                {/* Pagination controls on the right */}
                <MDBox display="flex" alignItems="center" gap={1}>
                  <IconButton
                    onClick={() => {
                      const newPage = Math.max(1, page - 1);
                      setPage(newPage);
                      setInputValue(newPage.toString());
                    }}
                    disabled={page === 1}
                    size="small"
                  >
                    <ArrowBackIosNewIcon fontSize="small" />
                  </IconButton>

                  <TextField
                    value={inputValue}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    onKeyPress={handleKeyPress}
                    size="small"
                    sx={{ width: 60 }}
                    inputProps={{ style: { textAlign: "center" } }}
                  />

                  <IconButton
                    onClick={() => {
                      const newPage = Math.min(totalPages, page + 1);
                      setPage(newPage);
                      setInputValue(newPage.toString());
                    }}
                    disabled={page === totalPages}
                    size="small"
                  >
                    <ArrowForwardIosIcon fontSize="small" />
                  </IconButton>
                </MDBox>
              </MDBox>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <MDBox
                mx={2}
                mt={-3}
                py={3}
                px={2}
                variant="gradient"
                bgColor="info"
                borderRadius="lg"
                coloredShadow="info"
              >
                <MDTypography variant="h6" color="white">
                  Projects Table
                </MDTypography>
              </MDBox>
              <MDBox pt={3}>
                <DataTable
                  table={{ columns: pColumns, rows: pRows }}
                  isSorted={false}
                  entriesPerPage={false}
                  showTotalEntries={false}
                  noEndBorder
                />
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Tables;
