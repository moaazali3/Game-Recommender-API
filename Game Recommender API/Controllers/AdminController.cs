using Microsoft.AspNetCore.Mvc;

namespace Game_Recommender_API.Controllers
{
    public class AdminController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
