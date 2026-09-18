namespace Game_Recommender_API.Services
{
    public class MlWarmupHostedService : IHostedService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<MlWarmupHostedService> _logger;

        public MlWarmupHostedService(IServiceProvider serviceProvider, ILogger<MlWarmupHostedService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            // Fire in background on server start so it doesn't block web server startup
            _ = Task.Run(async () =>
            {
                try
                {
                    await Task.Delay(2000, cancellationToken); // brief wait for server pipeline to initialize
                    using var scope = _serviceProvider.CreateScope();
                    var mlService = scope.ServiceProvider.GetRequiredService<MlRecommendationService>();
                    _logger.LogInformation("[MlWarmupHostedService] Server started - triggering background Hugging Face wake-up...");
                    await mlService.WarmUpAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("[MlWarmupHostedService] Startup warmup exception: {Message}", ex.Message);
                }
            }, cancellationToken);

            return Task.CompletedTask;
        }

        public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    }
}
