const { CatchAsync } = require("../ErrorHandling/utils");
const Product = require("../models/ProductModel");

exports.getSearchProduct = CatchAsync(async (req, res, next) => {
  const query = req.query;
  let queryObject = { ...query };
  let queryString = JSON.stringify(queryObject);
  queryString = queryString.replace(
    /\b(gte|gt|lte|lt)\b/g,
    (match) => `$${match}`
  );
  queryObject = JSON.parse(queryString);
  const exludeKeys = ["page", "limit", "sort", "searchText"];
  exludeKeys.forEach((key) => {
    delete queryObject?.[key];
  });

  page = parseInt(query.page);
  limit = parseInt(query.limit);
  if (!page || isNaN(page)) {
    page = 1;
  }
  if (!limit || isNaN(limit)) {
    limit = 10;
  }
  if (page < 1) page = 1;
  if (limit < 1) limit = 10;
  // skip
  const skip = (page - 1) * limit;

  let sortingQuery;

  let productQuery = Product.find({
    $and: [{ ...queryObject }, { $text: { $search: query.searchText } }],
  })
    .skip(skip)
    .limit(limit);

  // sorting
  if (query.sort) {
    sortingQuery = query?.sort?.split(",").join(" ");
    productQuery = productQuery.sort(sortingQuery);
  }
  let results = await productQuery;

  if (results.length === 0) {
    results = await Product.find({
      $and: [
        { ...queryObject },
        {
          $or: [
            { name: { $regex: query.searchText, $options: "i" } },
            { description: { $regex: query.searchText, $options: "i" } },
            { brand: { $regex: query.searchText, $options: "i" } },
            { category: { $regex: query.searchText, $options: "i" } },
          ],
        },
      ],
    });
  }
  res.status(200).json({
    status: "success",
    results,
  });
});
