// plugin/download/api.js
export default (express) => {
  const router = express.Router();

  router.get("/hello", (req, res) => {
    res.json({ message: "Hello from Download API!" });
  });

  return router;
};
