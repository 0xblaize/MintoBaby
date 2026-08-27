from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from .config import settings
from .services.chain import ChainService, NETWORKS
from .services.executor import ExecutorService
from .services.scheduler import SchedulerService
from .services.copy_mint import CopyMintService
from .routers import wallet, discovery, mint, copymint, auth

app = FastAPI(
    title="MintoBaby Matrix API",
    description="Multi-Chain NFT Mint Sniper & Copy-Mint Engine for Robinhood Chain, Ink L2, and Solana",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(wallet.router)
app.include_router(discovery.router)
app.include_router(mint.router)
app.include_router(copymint.router)


@app.on_event("startup")
async def startup():
    chain              = ChainService(settings.robinhood_rpc_url, settings.robinhood_chain_id, "robinhood")
    app.state.executor  = ExecutorService(chain)
    app.state.scheduler = SchedulerService(app.state.executor)

    def executor_factory(network):
        net_cfg = NETWORKS.get(network, NETWORKS["robinhood"])
        net_chain = ChainService(net_cfg["rpc"], net_cfg["chain_id"], network)
        return ExecutorService(net_chain)

    app.state.copy_mint = CopyMintService(executor_factory)


@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")


@app.get("/health")
async def health():
    return {
        "status":   "ok",
        "networks": ["robinhood", "ink", "solana"],
        "chains": {
            "robinhood": {"chain_id": settings.robinhood_chain_id, "rpc": settings.robinhood_rpc_url},
            "ink": {"chain_id": settings.ink_chain_id, "rpc": settings.ink_rpc_url},
            "solana": {"chain_id": None, "rpc": settings.solana_rpc_url}
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host=settings.api_host, port=settings.api_port, reload=True)
