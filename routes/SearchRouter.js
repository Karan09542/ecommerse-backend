const express = require("express");
const { getSearchProduct } = require("../controllers/SearchController");
const SearchRouter = express.Router();

SearchRouter.get("/", getSearchProduct);

module.exports = SearchRouter;
