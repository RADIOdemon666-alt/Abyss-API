export default (express) => {
  const router = express.Router();

  router.get("/", (req, res) => {
    res.json({ message: "Hello from example API!" });
  });

  router.get("/test", (req, res) => {
    res.json({ message: "Test route works!" });
  });

  return router;
};
