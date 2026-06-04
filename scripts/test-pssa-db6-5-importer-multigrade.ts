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

function testGrade3GoldenHashes() {
  const plan = buildPlan(3);
  assert.equal(plan.activeItems.find((item) => item.itemId === "pssa_item_g3_reading_1")?.contentHash, "sha256:1fea51d2127fc1a7d087348c736003278508a97589eddfb9eb9c489342c1fa2f");
  assert.equal(plan.activeItems.find((item) => item.itemId === "pssa_sa_g3_creek_main_idea_01")?.contentHash, "sha256:f8aafc9cf82a2957c3f2d33760bacaf3c7abaefddd4ac5c4132fa4be7a5814d2");
  assert.equal(plan.passages.find((passage) => passage.passageId === "pssa_psg_g3_the_mural_plan")?.contentHash, "sha256:b5a4ebf1c2057220d73ad63a925607b00c677be0a10f56da1abd1cabe3b0adbb");
}

function testSourceCorpusHashParity() {
  const plan = buildPlan(3);
  const sourceCorpusHash = stableStringify([...plan.passages.map((row) => row.contentHash), ...plan.activeItems.map((row) => row.contentHash), ...plan.deprecatedItems.map((row) => row.contentHash)].sort());
  assert.equal(sourceCorpusHash, GRADE3_SOURCE_CORPUS_HASH);
  assert.equal(currentPlanSourceCorpusHash(3), GRADE3_SOURCE_CORPUS_HASH);
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
testSourceCorpusHashParity();
testUnregisteredGradeRefuses();
testManifestValidation();

console.log("PSSA DB-6.5 importer multi-grade tests passed.");
