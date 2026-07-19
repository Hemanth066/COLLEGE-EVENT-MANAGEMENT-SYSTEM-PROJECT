const express = require("express");
const router = express.Router();

console.log("Router type:", typeof router);
console.log("Router is function:", typeof router === 'function');
console.log("Router:", router);

router.get("/test", (req, res) => {
  res.json({ message: "test" });
});

module.exports = router;
