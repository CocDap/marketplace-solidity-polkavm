import { HardhatUserConfig, vars } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@parity/hardhat-polkadot';
import 'dotenv/config';

const config: HardhatUserConfig = {
    solidity: '0.8.28',
    resolc: {
      compilerSource: 'npm',

    },
    networks: {
        hardhat: {
            polkavm: true,
            // Uncomment to deploy to a local fork of the westend network.
            // forking: {
            //     url: 'wss://westend-asset-hub-rpc.polkadot.io',
            // },
            // Uncomment to deploy to a local node using the node binary
            nodeConfig: {
                nodeBinaryPath: './binaries/substrate-node',
                rpcPort: 8000,
                dev: true,
            },
            adapterConfig: {
                adapterBinaryPath: './binaries/eth-rpc',
                dev: true,
            },

        },
        localNode: {
            polkavm: true,
            url: `http://127.0.0.1:8545`,
        },
        paseoAssetHub: {
            polkavm: true,
            url: 'https://testnet-passet-hub-eth-rpc.polkadot.io/',
            accounts: [process.env.PASEO_ASSET_HUB_PK!],
        },
    }
};

export default config;
