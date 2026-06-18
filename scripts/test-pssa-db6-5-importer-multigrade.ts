import assert from "node:assert/strict";

import { currentPlanSourceCorpusHash } from "@/lib/content/pssaItemReview";
import {
  GRADE3_IMPORT_MANIFEST,
  PSSA_GRADE_IMPORT_MANIFESTS,
  buildPlan,
  lookupPssaGradeImportManifest,
  stableStringify,
  type PssaGradeImportManifest,
} from "./content/lib/pssa-import-plan";

const GRADE3_SOURCE_CORPUS_HASH = "[\"sha256:095c34d5d858406c94e56d2a6eadc7d658861a469c6f8f8909e7014b4300735b\",\"sha256:0b1772d420a25cdf086a5c786080f9f7dc39f14ac5cf33eec6e0f6baa3ed14df\",\"sha256:11dfb1cbbc2de5de7576e93dfe475148ac6bd5cad3cef26e40cb7448ed9d16ca\",\"sha256:13b6ce80452427bf635487cfdee34a6a026eaa110a3ec2a039486bad5527567c\",\"sha256:176be642335688d9710b186a49bd532f6b43244b500cb1d30e7ee9af79492ca7\",\"sha256:1d68c90c499886adac8f35aa0ace6cdef4bce75e3a66d53e99c9fc8a1b5330cc\",\"sha256:1db67462de3d203ca0fa3e29487ce696fd343d4b7b384e5e22cbb5b671b4e1b9\",\"sha256:1f2d029e1f9ad5fb0263bb265dda7c87aaf85d808abd7daddc457ce1ad943f5b\",\"sha256:1fea51d2127fc1a7d087348c736003278508a97589eddfb9eb9c489342c1fa2f\",\"sha256:24794d009bd26d1e6cc2b487125be410a1ba8f99147189cdf22b6ff4908138ca\",\"sha256:28aa35c18b7e26c94f916a38bd3de23e545865497e222132c068f57dcf1c01da\",\"sha256:2982902887780d5a676a15e2620946d680b97a8fdb2a6689c76fd55a5de0f1cf\",\"sha256:2c0fe88774b10b3171b39bf1590a3ad4face205f97059b6ceaa152b520671a83\",\"sha256:2df8adff46e27632a36fcbe991a551b49333e62c19e4e841522d143f9771e59c\",\"sha256:33d193fc76a3ae67d14377dd9ff5a1f14ab02cbeae534f5e16fc96d578e3113f\",\"sha256:3779e49d0b3b7dd4413af4fa5305b8a8eaa90eda95605fba03039a35d1e5a497\",\"sha256:39cd428a657f00fbc5df6e35f8fba3b742cadf7c8ca7b69a099bfe45930e5654\",\"sha256:3bbf2bf9055c339dd558e052d4de44d6399f7d6197bbc28a39e77afec4e0ac4b\",\"sha256:3c7061a26db11849d9cee44b6cb41f32db3837ac09d1fe09ed8982e8c46edf90\",\"sha256:3f43500dea96361d79f4e5169408f069238a49e8b4ae5e85153ccd6efb10cdb0\",\"sha256:3fe52da2d43b7f7e6f4ea61f226c4d57e5a9995867f1054f1b0b538052b65ce2\",\"sha256:5476bb498997134b4ceddd0f4e7b133f3cd45a8b2747a083acb98cb0c7ac21af\",\"sha256:547c58b558aee4d3843a6f2f307a27b27e5f8cd29ef9b7e4575d5c71d82de623\",\"sha256:557639aab4a214972b92698285dd586205ca0696492e7945e03aa5ec7394aa9d\",\"sha256:578057900cbee916650e1877d1dc53cc4bad0ae952c803e82d962dd28c345b7f\",\"sha256:5839b9d41ed7043391b1a02325840641cbd99dda31da046fdfee32e897107505\",\"sha256:59259d1496d57986708d713c73dbc6d1c1db855d82e05db158489788b8a3a67c\",\"sha256:5b5794c1ea2728d685c47fb7ad65bf39d33780dd0e3f1e7692da5f48f30baec0\",\"sha256:60761289b3028c4864e56330719cb7ba67f503d56f45c78e920e3077fb50b2ce\",\"sha256:6716b88123b36e5b3b4372b61c9872d529b573a2dec2545481fb5455906780a9\",\"sha256:68ebf8194dd8472779520220b41f16af9095b8bb95285a9e3a70c736544cebe4\",\"sha256:6af448e85eafad43a2a590ed61323b884e851222fc8b55bdf741039317ac4e79\",\"sha256:6eec9ba87b7ca6120bd2d1bc9792bf4ced91394d61d60154d8e8c87098240072\",\"sha256:72d2a5ca18fa50f247d5fb2dc9fea7f7b107b2c0d6663b8bfab397f663f7fe03\",\"sha256:75f231eaca9ec70a5d5ca9c9b1c9b8823c229a2933f37ddefc3df9241ff2dfa3\",\"sha256:76d2ab6e66025c1d9b18d5407f27d8feb5f8924847d19464dfcdd345ca85e8db\",\"sha256:773f40fb289b4f98ac646923ce33e42f51f21d7f143d8c1bf41bb36b0a7a4ce4\",\"sha256:7b2a1a8b6d1f9c9c3d2180629ce50bdcac731d3501ada1604e54c5ffd581efc4\",\"sha256:7bb65cfc2b369cc5d55d3c846c4eded3e692a94630f09b95e58c732470e8bb8b\",\"sha256:7d682cba46621293f8886267c5131c1bd68e3b253cb6ce2b5aaaa33ab161e96e\",\"sha256:7f1f8bbcbcea207b03fa32dc05f88cf677cd33b4f120093ef04b5112d82a8fb5\",\"sha256:81a5ae3354ac011bd8bb6a3a119c296fb0356aecd19f1d69a7cf6a9cf28acaf8\",\"sha256:83eaaf7c87fc0b0214d2a02abc8e9ffbc2bd5d3a9041c64f97ac00ff0f7a03c7\",\"sha256:84d2961b3193696e4e7a4e66a44dd5c40a0b1684104d6b1546dc1fec41f3e364\",\"sha256:87617d8b226b2465c83660013a2f661c3272753e61dd7e0d6cdc11e190acab8c\",\"sha256:8c792db2b5bda20090065cd7cfb6cadd523819b4243eab36519a33281256293b\",\"sha256:8f06bc0808a20ecd522bf8049d03df1b38ae8ec6ff44605b4219cd34f20c8100\",\"sha256:90352b6552b94172ed919c8bc2304a8d540e29016d92e77daf0c5b41d85e2df3\",\"sha256:910d93773a44817039633eb610807b8aaafdde7da815a7608b8a466cf57b0358\",\"sha256:a386a422cf4d6dbe2124478d0ec36b3f3d53fbb315e566ae802e059fa4cf6eb6\",\"sha256:aea63919cae94280b19b2548b7f51db40154355be4d2d74a9fb6e8cb63249319\",\"sha256:b01fb2d90633c1f591e64a4076a56add905dabd4fe69b5bc7698de6bab4aa649\",\"sha256:b04629a06694f9a9f57b1a17966bbd59b9b6b8eb1623be5093de08820d446c9f\",\"sha256:b0a3d92acd4d84c7944c3565e94a5b1ca9c65c1454b150fb836334864d500391\",\"sha256:b3b5914487e047fee143b5b47d8452e28853fb7cd19aab4e0268b57876900455\",\"sha256:b5a4ebf1c2057220d73ad63a925607b00c677be0a10f56da1abd1cabe3b0adbb\",\"sha256:b803a26c347cdb80fc79ee0705cc5336e4fbd96c30c989cf3c5a4128667579ba\",\"sha256:b8b8b551acbac9494053a08954790d004dd4a9038c74a3fc1848e261bc0de252\",\"sha256:b96f186ae7356b1b92205a437c861d22484384f5887fca24736477a7f843cd05\",\"sha256:bfde3be8b089766201c37bc74b3e298143b4770141f32c3d8badbcf062b3b07c\",\"sha256:c32c9f69a92adfcc35317a3b1859f4019bc383af233e03c5a7e7e47afacb2b7e\",\"sha256:c8559d9bd2f49cd80485d64bd1cc89ea6458eaaab3ea8c107e5e89d3f8375971\",\"sha256:c990f18eaae449f8d8beea1e9c0acb4a14539829b893c4d9d97c026a7d36187c\",\"sha256:ce172561d42802d333077a43df1d604217ef6d17442e87e786b257665859132c\",\"sha256:d0ac3d3cb45ce6fe2bbb093bbcacf086846fd1d4a2fe9783c53e2a605c6aeae0\",\"sha256:d552f261a42870ffc84a17ab5f2d4fe634b1ae1b42bc5b3feef06241e06477ac\",\"sha256:d55d34cce40d414f786d3fa245771bbf613b2cedee95de9469740964ab69b18b\",\"sha256:d90d1304f64e671bc2f9b8ee55aa92bcae6d3004e71cdd828eb6938268825934\",\"sha256:d9ed77a4331dc7a483f5681e4fb2101052450767c54ef9fb51c2d193176615df\",\"sha256:dab7663be02ee9b035d69fadae24c8cfe5eb6cb86b9968ba213dead9770d4c4b\",\"sha256:dbc7b6b64a2c5ba131182bb2a211cb4ea8717a17dfcb26319af47213b311e1df\",\"sha256:dc0615f301526e1facedded9d16816443cf5cd68ca24420f732ef6765f240125\",\"sha256:e3a825840495667ce4dd1627a0fa362e463f03ac5281da64f01720e36758ccca\",\"sha256:e8aa4921ff7864a781db20be8843a3890ba8c5c8162626236cd9a0330f7828c9\",\"sha256:ecb16811cabdc2e036f1de818ee16f2e0655f238b3b43d4136e6245584694c3d\",\"sha256:ed9b542647feec60711dfb29d8a1bb3b7be471195869581768aa7fc8c072cc0b\",\"sha256:f3df4c0eace150cbc80198eaa73cd624c0ce0ea80df97b30f3ac72736acee29a\",\"sha256:f4f76b68e2bfcb7fb1da072c63c2c493dc56ebc8ab513565176d0b5c7cb6b227\",\"sha256:f6907047ae00de02ab610ed7334afd066adc333c2179a0747e9730e16d37af4e\",\"sha256:f8aafc9cf82a2957c3f2d33760bacaf3c7abaefddd4ac5c4132fa4be7a5814d2\",\"sha256:fa2db7f3d964123b52e100156db9042cac493b244f1799b8621ee74026db7a53\",\"sha256:fc76f1d26c8ba1f72001b512fc29a76ca060f058c7f1ef42c3c9a177909bbce5\",\"sha256:fc99bbcdefebc8f3e9cdcce67ffbe24db290c32daaf0f7c8fa59691f6866a46e\",\"sha256:ff03b5ba77028141113776c0f6f4a55a2ca79353ea9d3271824023a4531a3a2e\"]";

const VOCAB_NORMALIZATION_HASH_REPLACEMENTS = [
  ["sha256:3c7061a26db11849d9cee44b6cb41f32db3837ac09d1fe09ed8982e8c46edf90", "sha256:580dbd7fc3a41601d32d6e540a3010d9113de8864ce836a938e318d62a84adb3"],
  ["sha256:3fe52da2d43b7f7e6f4ea61f226c4d57e5a9995867f1054f1b0b538052b65ce2", "sha256:604f6ea0ba9efc69bbca441daf8a3ba33b341bc1a7fe8512fa00309ba506f45d"],
  ["sha256:f3df4c0eace150cbc80198eaa73cd624c0ce0ea80df97b30f3ac72736acee29a", "sha256:0f412822e818f5e4e36726b8e5ed614262e4a809e0c5c2f0679017862cb42452"],
  ["sha256:fa2db7f3d964123b52e100156db9042cac493b244f1799b8621ee74026db7a53", "sha256:61f0f9c09d35b62202b1575bf7b343b01f240e7d96715e7bc40911c16add87bd"],
] as const;

const GRADE3_SOURCE_CORPUS_HASH_AFTER_VOCAB_NORMALIZATION = stableStringify(
  (JSON.parse(GRADE3_SOURCE_CORPUS_HASH) as string[])
    .filter((hash) => !VOCAB_NORMALIZATION_HASH_REPLACEMENTS.some(([before]) => before === hash))
    .concat(VOCAB_NORMALIZATION_HASH_REPLACEMENTS.map(([, after]) => after))
    .sort(),
);

const LITERARY_TOPUP_HASH_ADDITIONS = [
  "sha256:020e754444f8e6802f567d31cd6cddf536c6faa6f6b210da471fd95340755d84",
  "sha256:092bac0e5cab32e7ed7eab59f0d0a8e6324c688af4d5626e7b881ed91cd343cf",
  "sha256:125ed4c4a1c729376788bb2439a565b4ad310c51b9f875d1731f82cbfc53118e",
  "sha256:1889ab1a10d051c438d983561e0792caa4a7eff0da39d833c491420cf1b60c56",
  "sha256:361d978bd197a0d2254b8972623ebed7738231b9d5fd44fb661d6200af2a8cee",
  "sha256:38ace888856cc5d3a2b08c51dfd96137626602bf0bb6ca05c3b7f45196a4e0ac",
  "sha256:3bf2d831467dc0a37148d90ac4165fcf1858e4352473a655cf7292201d1655ea",
  "sha256:4c2cc9a53ee626cc77dfdcf42edd996699fbb148ba507cd56bd0a10960479424",
  "sha256:5cccd697b143cd1ce8c9702f21106a37339608acbd511624e5527fd4c47ffd7b",
  "sha256:5d0f2e499f0c22a7e80e03174fd3dce1f16383c11f444f8ecd60d3da68d59d0a",
  "sha256:68e54473366c3cd9e213bafd8dd0d25e4227c7a6b59f225b68f3e36d9b043769",
  "sha256:6aa6d8cc04632215b44eb790d652435f672f6f23df77af149432d2ba86658564",
  "sha256:6e0a084845297325a12dfe994b5d186634b7952639bd62dbeaf4201b6171570b",
  "sha256:6f2856d28314743cb1139ac2c4c14878d08644bb1de1d1de595488dafceca58a",
  "sha256:9a8a0052df0960f48a228554e3f2d6497ed41c67d5de8173923b5debe730e85d",
  "sha256:a1a12c651902091099d0a0f1a6f4b235fce1629b7ca55783ec265c092c1f73d5",
  "sha256:bcb5ba75771bde7da0cc41ca705053add3720ddb8e9fac25407bd2b089f2a26c",
  "sha256:c162a47e8e5a90106f89de9850d8aa55e04e6fe76491cda2e6437e985966e83d",
  "sha256:c41107337f8d456059aabce2a2acb71bef6fd8bec9ffa23fbda3a7f8096a6642",
  "sha256:c4ce31f24c3c6584ba22d4916f068b87c0fbfbe8642769b664441840665936a6",
  "sha256:cd00bc6deceb7c79c927ec24d9a59d23d93289efa3ec8f3eb63076b7716c4f27",
  "sha256:df7425b7461503e7e83b8993d5d2503dbb65fdde3ea987be84192a8339e0c67a",
  "sha256:e4d55eb796804b85f4b71e4d433102a47e2b1a553ba741b1bc597bd03c72d378",
  "sha256:e8e84b08765aece8fffbfe98f2cfc89ab3578718d57e407a4cc245cafbc68c9b",
  "sha256:fc5f97eab40fd337b27c260d771c6fed0c62e3f2d66b8cdff56311c25881911a",
  "sha256:fce492739823239afdc81ccf6702e1e7a8783cf097008bf480f888071658c90e",
] as const;

const GRADE3_SOURCE_CORPUS_HASH_AFTER_LITERARY_TOPUP = stableStringify(
  (JSON.parse(GRADE3_SOURCE_CORPUS_HASH_AFTER_VOCAB_NORMALIZATION) as string[])
    .concat([...LITERARY_TOPUP_HASH_ADDITIONS])
    .sort(),
);

const GRADE3_SOURCE_CORPUS_HASH_AFTER_CONTENT_QUALITY = "[\"sha256:001bbb9e0036e4ef8d9c46b46cd075ea2107271aeec4b1bb85d9728ecbea9244\",\"sha256:020e754444f8e6802f567d31cd6cddf536c6faa6f6b210da471fd95340755d84\",\"sha256:033656c36c480cccf00b9a5c92e4d4cd32a76735a563a1d27b3a926b3cd3a262\",\"sha256:08cc9b0ff2019595f2c17964524392dfe7d481424abdcfaa3ad74c117386ee57\",\"sha256:0b1772d420a25cdf086a5c786080f9f7dc39f14ac5cf33eec6e0f6baa3ed14df\",\"sha256:0f412822e818f5e4e36726b8e5ed614262e4a809e0c5c2f0679017862cb42452\",\"sha256:11dfb1cbbc2de5de7576e93dfe475148ac6bd5cad3cef26e40cb7448ed9d16ca\",\"sha256:13b6ce80452427bf635487cfdee34a6a026eaa110a3ec2a039486bad5527567c\",\"sha256:16600ee6db45b76db4fd72253aed5c5057043e6546dafa2ef259b42be8137542\",\"sha256:170b123c67880e4375dd336a0e4ac2dd99e84d52ff75f7bdd9bbafd261e729c1\",\"sha256:176be642335688d9710b186a49bd532f6b43244b500cb1d30e7ee9af79492ca7\",\"sha256:1ca5f6e53de53ce030e2a983728a09ba083d5541f1842bdfbdc60983b8a14e84\",\"sha256:1d68c90c499886adac8f35aa0ace6cdef4bce75e3a66d53e99c9fc8a1b5330cc\",\"sha256:1f482a5c5aa9633614928e57b836a7bb41fc43d8086dc4d10463b7f4655ac44b\",\"sha256:28aa35c18b7e26c94f916a38bd3de23e545865497e222132c068f57dcf1c01da\",\"sha256:28d0895f120493b6fa6f12b48657a8c87e9177b5b48e62e3415a0c2719babaea\",\"sha256:28e67d0d65e6e9e0e9be55da6576f91422b7f17ffb46b146e0e23f64ef3dda83\",\"sha256:2c0fe88774b10b3171b39bf1590a3ad4face205f97059b6ceaa152b520671a83\",\"sha256:2d96ab0d6c3f19ccdea4573e40227ef492e98c3fc88d2aeadff4271fc718ebf0\",\"sha256:325a887ca3d46274924b99d1956cc3d2fe178847460a68e1a0050aebe64160e9\",\"sha256:33d193fc76a3ae67d14377dd9ff5a1f14ab02cbeae534f5e16fc96d578e3113f\",\"sha256:3538ee346e8964b039e243ac9a9ca53cc36fe47639d4ec36c87365e9f4a381e5\",\"sha256:3564d6cee72fac697c4690b4a3f2448cabe985f64e499db4a5a0fa9acf986139\",\"sha256:3779e49d0b3b7dd4413af4fa5305b8a8eaa90eda95605fba03039a35d1e5a497\",\"sha256:386d5ff809bca2f19ed6cf84ad22295c0f926f7764d84087690f590b127712c1\",\"sha256:38ace888856cc5d3a2b08c51dfd96137626602bf0bb6ca05c3b7f45196a4e0ac\",\"sha256:39c105e74c41eea99db9a9c71fbd1da8e4a5b29809587eed31e1bf9fc6d86143\",\"sha256:3bbf2bf9055c339dd558e052d4de44d6399f7d6197bbc28a39e77afec4e0ac4b\",\"sha256:41308b2a64162c1fe73e8d7d0f6bb12baafdc3e0a5e047f3d096fc7b9db4b998\",\"sha256:43ebc9ecb296924817d5f706d6c09cbc0c55190c9611c57764ca7c05390fd767\",\"sha256:4654f4b35efa7b0731842140fc2ea613237a84d81480ce624cb38012a08fbe1c\",\"sha256:5476bb498997134b4ceddd0f4e7b133f3cd45a8b2747a083acb98cb0c7ac21af\",\"sha256:547c58b558aee4d3843a6f2f307a27b27e5f8cd29ef9b7e4575d5c71d82de623\",\"sha256:548ca2a659608a082c0c858f7c51916a0aea1d2ed494fa0a27f1c167afb6d469\",\"sha256:55897cd669d1b88d68f548ac2a7f7660e02777fcd6bc2a9d3d8e0cac77adb45e\",\"sha256:55fbfa9cebf6d3be2f1015265cffb3eaa5e7349d36d78a4259f3f112d16c9db2\",\"sha256:580dbd7fc3a41601d32d6e540a3010d9113de8864ce836a938e318d62a84adb3\",\"sha256:5912a546dfdd21bd8ab9e45ab8a5c04dddbac1864075aab907a40f059958d4c9\",\"sha256:5bcab1a7ee88b3b53b358129025d5df43090584b16a3653255e3af5a1012d2b5\",\"sha256:5d0f2e499f0c22a7e80e03174fd3dce1f16383c11f444f8ecd60d3da68d59d0a\",\"sha256:604f6ea0ba9efc69bbca441daf8a3ba33b341bc1a7fe8512fa00309ba506f45d\",\"sha256:60761289b3028c4864e56330719cb7ba67f503d56f45c78e920e3077fb50b2ce\",\"sha256:61f0f9c09d35b62202b1575bf7b343b01f240e7d96715e7bc40911c16add87bd\",\"sha256:67468d244d15213e7aff0ed12e7124258e9a11a7b6b3955910ec940376c2ff86\",\"sha256:68ebf8194dd8472779520220b41f16af9095b8bb95285a9e3a70c736544cebe4\",\"sha256:6d1bb61884819a4f6e7d09b550e3270bf3c3670f625f7d932dc6ab893487da8f\",\"sha256:6f2856d28314743cb1139ac2c4c14878d08644bb1de1d1de595488dafceca58a\",\"sha256:740b3e8f2971cb1c317cebfe1d7489ec3cae4101f190de6bcd790251bc37c56e\",\"sha256:773f40fb289b4f98ac646923ce33e42f51f21d7f143d8c1bf41bb36b0a7a4ce4\",\"sha256:7b2a1a8b6d1f9c9c3d2180629ce50bdcac731d3501ada1604e54c5ffd581efc4\",\"sha256:7b9146f65c94709cc5d96a8f827c587e80c228f6ac51b2b2d51f5b38fe328c5a\",\"sha256:7d124b958025e8e192a1f0c7af5a75c64d12e1c23a2757d48a749aeb62cb872a\",\"sha256:7f1f8bbcbcea207b03fa32dc05f88cf677cd33b4f120093ef04b5112d82a8fb5\",\"sha256:84d2961b3193696e4e7a4e66a44dd5c40a0b1684104d6b1546dc1fec41f3e364\",\"sha256:86c74618dada0a67bf75390a70c1a3395b844a0998b6b2f380ec132a8327e050\",\"sha256:87617d8b226b2465c83660013a2f661c3272753e61dd7e0d6cdc11e190acab8c\",\"sha256:8a65701257b2a0139b62b340ef0de288673d3bc09c15f1b1ae8b11b427c99767\",\"sha256:8aefa7213ef4cfe98d4deff47df4ab2b7a74f1c0c24583f5db4296d9be06c40d\",\"sha256:8c2e7760a513b968ab2b15f9d2f618414ffda2fa8a79e75aa8194f928aecf6e9\",\"sha256:8f06bc0808a20ecd522bf8049d03df1b38ae8ec6ff44605b4219cd34f20c8100\",\"sha256:94332f1e9d495017e055050ac8d5b0a2e2220bb7729778fef79586e77029615c\",\"sha256:9595ce7df4d6beb3443a96dca09841ed5edf5a90e6294377d2f238b37f592ddc\",\"sha256:95c4bd0c3737f1e61796a817eb0a1ba12373e5619b1d903ca9ae25732581480d\",\"sha256:9e2b88b74e7f58d5de389a8226356ad42d9fb90a28c9d1499b1d39680a42a07d\",\"sha256:9f2b061e4a5c723b152ab3e1453fe6b5e9b451685c284df243d54f6fbae4472b\",\"sha256:a1a12c651902091099d0a0f1a6f4b235fce1629b7ca55783ec265c092c1f73d5\",\"sha256:a386a422cf4d6dbe2124478d0ec36b3f3d53fbb315e566ae802e059fa4cf6eb6\",\"sha256:a89a35f1238e4a0b8558ecac4f69000e43a854a2593e80356c56b09a042b47d4\",\"sha256:a8df67fca30521194fb7a06fd29cf422356c6f64b1aac4bb4720203b3034f21b\",\"sha256:a9f0060eb1ea356afdc13164df1c11c97e2f8e02d407cebf4c4ce8b011574604\",\"sha256:aa80918a3d8f33c06e78cc58c341c03b0fb75a008b8af5a73635e39e2601e05a\",\"sha256:aadead87a565e0924b6ad5491c97d1a084f94b92fcfb5899fdbfbac21cfefa34\",\"sha256:ab59e52b0c0cb60102ea557a2e00aa9b14371ef7ef9cc9193cf6fab469f2abef\",\"sha256:ae77d9b50efea363376c19ace9c29f2a6e7355cfd9b399268852c11f38e43b7d\",\"sha256:aea63919cae94280b19b2548b7f51db40154355be4d2d74a9fb6e8cb63249319\",\"sha256:b01fb2d90633c1f591e64a4076a56add905dabd4fe69b5bc7698de6bab4aa649\",\"sha256:b04629a06694f9a9f57b1a17966bbd59b9b6b8eb1623be5093de08820d446c9f\",\"sha256:b3b5914487e047fee143b5b47d8452e28853fb7cd19aab4e0268b57876900455\",\"sha256:b466f4a1c3f23abccac32b6a38b1cc65c13f69eecb618034f06a1b8e1f0b48b5\",\"sha256:b4bb6669f2dc5db1583f1b537353be7b66f5b974afb3b82038839f340bd810d9\",\"sha256:b5a4ebf1c2057220d73ad63a925607b00c677be0a10f56da1abd1cabe3b0adbb\",\"sha256:b96f186ae7356b1b92205a437c861d22484384f5887fca24736477a7f843cd05\",\"sha256:bfde3be8b089766201c37bc74b3e298143b4770141f32c3d8badbcf062b3b07c\",\"sha256:c162a47e8e5a90106f89de9850d8aa55e04e6fe76491cda2e6437e985966e83d\",\"sha256:c41107337f8d456059aabce2a2acb71bef6fd8bec9ffa23fbda3a7f8096a6642\",\"sha256:c63147873a1055ae47ee8a75a9cea55dfa3f0f106d828ed1e6676417b10f60fa\",\"sha256:c6db11f2b1ada8a8f5a0916e883a225796acb9d02fc340a9ee46b2cf5068c781\",\"sha256:c7d1ea2fbc5c6128d18868322b0947277d591d3f0af0ad0bc6052a1a139eebf2\",\"sha256:cb1187be7a75c946bd3bbadd9e42fdb79225118e462081a032d37636fc8542f6\",\"sha256:ce172561d42802d333077a43df1d604217ef6d17442e87e786b257665859132c\",\"sha256:d0ac3d3cb45ce6fe2bbb093bbcacf086846fd1d4a2fe9783c53e2a605c6aeae0\",\"sha256:d16b216aff0eedd00121fbb75ea1d8e710eb6813cb05a1e231beee6de1bbe866\",\"sha256:d25d5c19dd9818eabcb279cbd5d8975a9dc823cc679d0b8268b33df0aa7bd5e9\",\"sha256:d90d1304f64e671bc2f9b8ee55aa92bcae6d3004e71cdd828eb6938268825934\",\"sha256:dddb41382fc89f5a7ff967788696af00877a77f7fd12222b8131d648dd3a8205\",\"sha256:df7425b7461503e7e83b8993d5d2503dbb65fdde3ea987be84192a8339e0c67a\",\"sha256:e12c3a64c32d263e5ebe47e3646babfea784ba919cb57671f44e535506f33a58\",\"sha256:e31b99f85a06e31a5d6dcb9b4774c2c4aab34e1184be1c962d7af94a37c2d5cf\",\"sha256:e3a825840495667ce4dd1627a0fa362e463f03ac5281da64f01720e36758ccca\",\"sha256:e51b6c205a5b46b16a3c288e128b08ba22c26e2fe57d29718037515bff00e4de\",\"sha256:e8aa4921ff7864a781db20be8843a3890ba8c5c8162626236cd9a0330f7828c9\",\"sha256:e8e84b08765aece8fffbfe98f2cfc89ab3578718d57e407a4cc245cafbc68c9b\",\"sha256:ef3946d9b100359c8b5755fbdb93060054a29c70483008b0436ab9e30a7ae1dc\",\"sha256:f4f76b68e2bfcb7fb1da072c63c2c493dc56ebc8ab513565176d0b5c7cb6b227\",\"sha256:f5fd993fc3410eaa9c90292e5456dd0307a5ef0e9e58ba2e6873cb4c679dbfee\",\"sha256:f6907047ae00de02ab610ed7334afd066adc333c2179a0747e9730e16d37af4e\",\"sha256:fc69c22b9f32feec016c193d4acb7d38a1e90d3f364f5213ca3581b566092257\",\"sha256:fc99bbcdefebc8f3e9cdcce67ffbe24db290c32daaf0f7c8fa59691f6866a46e\",\"sha256:fdf6d17644bf0c67bbe73add3cd3138c2d9bac12be6fd0ddd55ca35e38908f25\",\"sha256:ff984c34a985aa0d5f14e55e7a40a562d4adca9e30ef2c1b27d1bfd3fcdc0dfb\"]";

const grade3Plan = buildPlan(3);

function testGrade3GoldenHashes() {
  const plan = grade3Plan;
  assert.equal(plan.activeItems.find((item) => item.itemId === "pssa_item_g3_reading_1")?.contentHash, "sha256:dddb41382fc89f5a7ff967788696af00877a77f7fd12222b8131d648dd3a8205");
  assert.equal(plan.activeItems.find((item) => item.itemId === "pssa_sa_g3_creek_main_idea_01")?.contentHash, "sha256:3538ee346e8964b039e243ac9a9ca53cc36fe47639d4ec36c87365e9f4a381e5");
  assert.equal(plan.passages.find((passage) => passage.passageId === "pssa_psg_g3_the_mural_plan")?.contentHash, "sha256:b5a4ebf1c2057220d73ad63a925607b00c677be0a10f56da1abd1cabe3b0adbb");
  assert.equal(plan.passages.find((passage) => passage.passageId === "pssa_psg_g3_the_lantern_list")?.contentHash, "sha256:6f2856d28314743cb1139ac2c4c14878d08644bb1de1d1de595488dafceca58a");
  assert.equal(plan.passages.find((passage) => passage.passageId === "pssa_psg_g3_the_porch_bell")?.contentHash, "sha256:c162a47e8e5a90106f89de9850d8aa55e04e6fe76491cda2e6437e985966e83d");
  assert.equal(plan.activeItems.find((item) => item.itemId === "pssa_sa_g3_lantern_message_01")?.contentHash, "sha256:c6db11f2b1ada8a8f5a0916e883a225796acb9d02fc340a9ee46b2cf5068c781");
  assert.equal(plan.activeItems.find((item) => item.itemId === "pssa_sa_g3_bell_character_01")?.contentHash, "sha256:8a65701257b2a0139b62b340ef0de288673d3bc09c15f1b1ae8b11b427c99767");
}

function testLiteraryTopupManifestShape() {
  const plan = grade3Plan;
  const topupPassages = plan.passages.filter((passage) => passage.sourceFile.includes("literary_topup"));
  const topupItems = plan.activeItems.filter((item) => item.importedFromFile.includes("literary_topup"));
  assert.equal(topupPassages.length, 2);
  assert.equal(topupItems.length, 24);
  assert.equal(plan.passages.length, 7);
  assert.equal(plan.activeItems.length, 91);
  assert.equal(plan.deprecatedItems.length, 12);
  assert.equal(plan.supersessions.length, 12);
  assert.equal(plan.batches.length, 8);
  assert.equal(new Set(plan.passages.map((passage) => passage.passageId)).size, plan.passages.length);
  assert.equal(new Set([...plan.activeItems, ...plan.deprecatedItems].map((item) => item.itemId)).size, plan.activeItems.length + plan.deprecatedItems.length);
}

function testConventionsVocabularyNormalization() {
  const rows: Record<string, any> = Object.fromEntries([...grade3Plan.activeItems, ...grade3Plan.deprecatedItems].map((item) => [item.itemId, item]));
  const expectedHashes = {
    pssa_conv_g3_hottext_spelling_01: "sha256:580dbd7fc3a41601d32d6e540a3010d9113de8864ce836a938e318d62a84adb3",
    pssa_conv_g3_hottext_function_01: "sha256:61f0f9c09d35b62202b1575bf7b343b01f240e7d96715e7bc40911c16add87bd",
    pssa_conv_g3_drag_address_01: "sha256:0f412822e818f5e4e36726b8e5ed614262e4a809e0c5c2f0679017862cb42452",
    pssa_conv_g3_drag_dialogue_01: "sha256:604f6ea0ba9efc69bbca441daf8a3ba33b341bc1a7fe8512fa00309ba506f45d",
  };
  for (const [itemId, hash] of Object.entries(expectedHashes)) assert.equal(rows[itemId].contentHash, hash, itemId);

  const spelling = rows.pssa_conv_g3_hottext_spelling_01;
  const functionItem = rows.pssa_conv_g3_hottext_function_01;
  assert.equal(spelling.responseSpecJson.selectableSpans.length, 8);
  assert.equal(functionItem.responseSpecJson.selectableSpans.length, 8);
  assert.equal(spelling.responseSpecJson.selectableSpans.every((span: any) => span.spanKind === "token"), true);
  assert.equal(functionItem.responseSpecJson.selectableSpans.every((span: any) => span.spanKind === "token"), true);

  const address = rows.pssa_conv_g3_drag_address_01;
  const dialogue = rows.pssa_conv_g3_drag_dialogue_01;
  assert.deepEqual([address.responseSpecJson.tokens.length, address.responseSpecJson.targets.length], [3, 2]);
  assert.deepEqual([dialogue.responseSpecJson.tokens.length, dialogue.responseSpecJson.targets.length], [3, 2]);
  assert.equal(JSON.stringify([address.responseSpecJson, address.correctResponseJson, dialogue.responseSpecJson, dialogue.correctResponseJson]).includes("slotId"), false);

  for (const key of collectKeys([spelling.responseSpecJson, functionItem.responseSpecJson, address.responseSpecJson, dialogue.responseSpecJson])) {
    assert.equal(/isCorrect|errorPattern|rationale|correct/i.test(key), false, `leaked authoring key ${key}`);
  }
}

function collectKeys(value: unknown, keys = new Set<string>()) {
  if (Array.isArray(value)) value.forEach((child) => collectKeys(child, keys));
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      keys.add(key);
      collectKeys(child, keys);
    }
  }
  return keys;
}

function testSourceCorpusHashParity() {
  const plan = grade3Plan;
  const sourceCorpusHash = stableStringify([...plan.passages.map((row) => row.contentHash), ...plan.activeItems.map((row) => row.contentHash), ...plan.deprecatedItems.map((row) => row.contentHash)].sort());
  assert.equal(sourceCorpusHash, GRADE3_SOURCE_CORPUS_HASH_AFTER_CONTENT_QUALITY);
  assert.equal(currentPlanSourceCorpusHash(3), GRADE3_SOURCE_CORPUS_HASH_AFTER_CONTENT_QUALITY);
}

function testUnregisteredGradeRefuses() {
  assert.throws(() => buildPlan(4), /No PSSA import manifest registered for grade 4\./);
}

function withManifest(gradeLevel: number, manifest: PssaGradeImportManifest, test: () => void) {
  const previous = PSSA_GRADE_IMPORT_MANIFESTS[gradeLevel];
  PSSA_GRADE_IMPORT_MANIFESTS[gradeLevel] = manifest;
  try {
    test();
  } finally {
    if (previous) PSSA_GRADE_IMPORT_MANIFESTS[gradeLevel] = previous;
    else delete PSSA_GRADE_IMPORT_MANIFESTS[gradeLevel];
  }
}

function testManifestValidation() {
  withManifest(98, { ...GRADE3_IMPORT_MANIFEST, gradeLevel: 3 }, () => {
    assert.throws(() => lookupPssaGradeImportManifest(98), /PSSA import manifest registry mismatch for grade 98\./);
  });
  withManifest(99, {
    ...GRADE3_IMPORT_MANIFEST,
    gradeLevel: 99,
    batchIds: { ...GRADE3_IMPORT_MANIFEST.batchIds, hotText: GRADE3_IMPORT_MANIFEST.batchIds.multiSelect },
  }, () => {
    assert.throws(() => lookupPssaGradeImportManifest(99), /PSSA import manifest has duplicate batch ids for grade 99\./);
  });
}

testGrade3GoldenHashes();
testLiteraryTopupManifestShape();
testConventionsVocabularyNormalization();
testSourceCorpusHashParity();
testUnregisteredGradeRefuses();
testManifestValidation();

console.log("PSSA DB-6.5 importer multi-grade tests passed.");
