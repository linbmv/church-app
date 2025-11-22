import axios from "axios";

const baseURL = "http://localhost:8080";

export const fetchPeople = async () => {
  try {
    const response = await axios.get(`${baseURL}/people`);
    const people = response.data;
    if (!localStorage.getItem("people")) {
      localStorage.setItem("people", JSON.stringify(people));
    }
  } catch (error) {
    console.error("Failed to fetch users:", error);
  }
};

export const createPerson = async (personData) => {
  const response = await fetch(`${baseURL}/people`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(personData),
  });
  return response.json();
};

export const updatePerson = async (id, personData) => {
  try {
    const response = await axios.put(`${baseURL}/people/${id}`, personData);
    return response.data;
  } catch (error) {
    console.error("Failed to update person:", error);
    throw error;
  }
};

export const deletePerson = async (id) => {
  const response = await fetch(`${baseURL}/people/${id}`, {
    method: "DELETE",
  });
  return response.json();
};

export const uploadProfilePicture = async (personId, file) => {
  const formData = new FormData();
  formData.append("ProfilePic", file);

  try {
    const response = await axios.post(
      `${baseURL}/people/${personId}/upload-profile-pic`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data", // axios handles this correctly for FormData
        },
      }
    );
    return response.data; // This should contain profilePicUrl
  } catch (error) {
    console.error("Failed to upload profile picture:", error);
    throw error;
  }
};
