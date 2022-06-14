const { getNamedAccounts, ethers } = require("hardhat")
const { networkConfig } = require("../helper-hardhat-config")

const AMOUNT = ethers.utils.parseEther("0.1")

async function getWeth(){

    const { deployer } = await getNamedAccounts()
    
    const iWeth = await ethers.getContractAt(
        "IWeth", //contract's interface
        networkConfig[network.config.chainId].wethToken, //mainet contract address of WETH
        deployer //Signer 
    )

    const tx = await iWeth.deposit({ value: AMOUNT })
    await tx.wait(1) // wait for 1 block confirmation

    const wethBalance = await iWeth.balanceOf(deployer)
    console.log(`Balance:  ${wethBalance.toString()} WETH in wei`)
}

//export the variables to be used by after importing in other js files
module.exports = { 
    getWeth,
    AMOUNT
}