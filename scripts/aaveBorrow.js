const { getWeth, AMOUNT } = require("../scripts/getWeth")
const { getNamedAccounts, ethers } = require("hardhat")

const { networkConfig } = require("../helper-hardhat-config")

async function main(){
    await getWeth() //get WETH Tokens which ERC20 compatible

    const { deployer } = await getNamedAccounts()
    
    const lendingPool = await getLendingPool(deployer)
    console.log(`Lending Pool Address: ${lendingPool.address}`)

    const wethTokenAddress = networkConfig[network.config.chainId].wethToken
    //give approval to the lendingPool to transfer WETH from user
    await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer)

    console.log("Depositing Tokens to Lending Pool.")
    await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0) // 0 - referral code
    console.log("Deposit Completed.")

    //get the current user's aave data
    let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(lendingPool, deployer)

    const daiPrice = await getDaiPrice() //getting price from Oracle
    const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber())

    console.log(`You can borrow ${amountDaiToBorrow} DAI`)

    const amountDaiToBorrowWei = await ethers.utils.parseEther(amountDaiToBorrow.toString())
    console.log(`You can borrow ${amountDaiToBorrowWei} WEI`)

    const daiTokenAddress = networkConfig[network.config.chainId].daiToken
    //Borrow the DAI Token after using the deposited WETH as collateral 
    await borrowDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer)

    //get the current user's aave data
    await getBorrowUserData(lendingPool, deployer)

    // Repay the borrowred DAI
    await repay(amountDaiToBorrowWei, daiTokenAddress, lendingPool, deployer)
    
    //get the current user's aave data
    await getBorrowUserData(lendingPool, deployer)

}

async function approveErc20(erc20Address, spenderAddress, amountToSpend, account){
    const erc20Token = await ethers.getContractAt("IERC20", erc20Address, account)
    tx = await erc20Token.approve(spenderAddress, amountToSpend)
    await tx.wait(1)
    console.log("ERC20 WETH Approved!")

}

async function repay(amount, daiAddress, lendingPool, account){
    await approveErc20(daiAddress, lendingPool.address, amount, account)
    const repayTx = await lendingPool.repay(daiAddress, amount, 1, account)
    await repayTx.wait(1)
    console.log("Loan has been Repayed!")
}

async function borrowDai(daiAddress, lendingPool, amountDaiToBorrowWei, account){
    const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrowWei, 1, 0, account)
    await borrowTx.wait(1)
    console.log("DAI Borrow Complete!")
}

async function getDaiPrice(){
    const daiEthPriceFeed = await ethers.getContractAt("AggregatorV3Interface",networkConfig[network.config.chainId].daiEthPriceFeed)
    const price = (await daiEthPriceFeed.latestRoundData())[1]
    console.log(`The DAI/ETH price is ${price.toString()}`)
    return price
} 

async function getBorrowUserData(lendingPool, account){
    const {
        totalCollateralETH,
        totalDebtETH,
        availableBorrowsETH
    } = await lendingPool.getUserAccountData(account)
    console.log(`You have ${totalCollateralETH} worth of ETH deposited.`)
    console.log(`You have ${totalDebtETH} worth of ETH borrowed.`)
    console.log(`You can borrow ${availableBorrowsETH} worth of ETH.`)
    return { availableBorrowsETH, totalDebtETH }
}

async function getLendingPool(account) {
    const lendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        networkConfig[network.config.chainId].lendingPoolAddressesProvider,
        account
    )
    const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool()
    const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account)
    return lendingPool
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })